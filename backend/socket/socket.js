// socket/socket.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// 全域計數器：儲存每個臨時聊天室的消息數量
const tempChatMessageCount = new Map(); // key: roomId, value: current count

const initSocket = (httpServer, connection, BASE_URL, JWT_SECRET) => {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error: token required'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.username = decoded.username || '未知用戶';
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 用戶連接: ${socket.userId} (${socket.username})`);
    socket.join(`user_${socket.userId}`);

    // 更新在線狀態
    connection.query(
      'UPDATE users SET last_active = NOW() WHERE id = ?',
      [socket.userId],
      (err) => { if (err) console.error('更新在線狀態失敗:', err); }
    );

    // 檢查是否有待通知的已接受邀請（作為發送方）
    (async () => {
      try {
        // 查詢該用戶作為發送方且 notify_sender = TRUE 的已接受邀請
        const rows = await new Promise((resolve, reject) => {
          connection.query(
            `SELECT ti.id, ti.room_id, ti.to_user_id, u.username as with_username
             FROM temp_chat_invites ti
             JOIN users u ON ti.to_user_id = u.id
             WHERE ti.from_user_id = ? AND ti.status = "accepted" AND ti.notify_sender = TRUE`,
            [socket.userId],
            (err, results) => {
              if (err) reject(err);
              else resolve(results);
            }
          );
        });

        for (const invite of rows) {
          // 補發 temp-chat-accepted 事件
          socket.emit('temp-chat-accepted', {
            inviteId: invite.id,
            roomId: invite.room_id,
            withUserId: invite.to_user_id,
            withUsername: invite.with_username,
          });
          console.log(`📡 向用戶 ${socket.userId} 補發離線期間的 temp-chat-accepted 事件 (roomId=${invite.room_id})`);

          // 清除通知標記
          await new Promise((resolve, reject) => {
            connection.query(
              'UPDATE temp_chat_invites SET notify_sender = FALSE WHERE id = ?',
              [invite.id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      } catch (err) {
        console.error('檢查待通知邀請失敗:', err);
      }
    })();

    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`用戶 ${socket.username} 加入房間 ${roomId}`);
      socket.to(roomId).emit('user-joined', {
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date()
      });
    });

    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      console.log(`用戶 ${socket.username} 離開房間 ${roomId}`);
    });

    socket.on('temp-chat-message', async ({ roomId, content }) => {
      console.log(`📨 收到 temp-chat-message: roomId=${roomId}, sender=${socket.userId}, content=${content}`);
      try {
        let count = tempChatMessageCount.get(roomId) || 0;
        console.log(`當前計數器 roomId=${roomId}, count=${count}`);
        if (count >= 10) {
          console.log(`⚠️ 房間 ${roomId} 已達上限，發送結束事件`);
          io.to(roomId).emit('temp-chat-ended', { roomId, reason: 'message_limit' });
          tempChatMessageCount.delete(roomId);
          return;
        }

        count++;
        tempChatMessageCount.set(roomId, count);
        console.log(`更新計數器 roomId=${roomId}, new count=${count}`);

        const message = {
          id: Date.now() + Math.random(),
          roomId,
          senderId: socket.userId,
          senderUsername: socket.username,
          content,
          createdAt: new Date(),
          message_type: 'text',
        };

        console.log(`廣播消息到房間 ${roomId}，發送者 ${socket.userId}`);
        socket.to(roomId).emit('temp-chat-message', message);

        if (count === 10) {
          console.log(`🔔 房間 ${roomId} 達到10條，發送結束事件`);
          io.to(roomId).emit('temp-chat-ended', { roomId, reason: 'message_limit' });
          tempChatMessageCount.delete(roomId);
        }
      } catch (error) {
        console.error('處理臨時聊天消息失敗:', error);
      }
    });

    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('user-typing', {
        userId: socket.userId,
        username: socket.username,
        isTyping
      });
    });

    socket.on('message-read', ({ roomId, messageId }) => {
      socket.to(roomId).emit('message-read-receipt', {
        userId: socket.userId,
        username: socket.username,
        messageId,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 用戶斷開: ${socket.userId}`);
      connection.query(
        'UPDATE users SET last_active = NOW() WHERE id = ?',
        [socket.userId],
        (err) => { if (err) console.error('更新離線狀態失敗:', err); }
      );
      socket.leave(`user_${socket.userId}`);
    });
  });

  const broadcastNewMessage = (roomId, message, senderId) => {
    let messageToBroadcast = { ...message };
    if (messageToBroadcast.message_type === 'image' && messageToBroadcast.content) {
      let content = messageToBroadcast.content;
      if (!content.startsWith('/')) content = '/' + content;
      messageToBroadcast.content = `${BASE_URL}${content}`;
    }
    io.to(roomId).emit('new-message', {
      ...messageToBroadcast,
      is_own: false
    });
    io.to(`user_${senderId}`).emit('message-sent', {
      ...messageToBroadcast,
      is_own: true
    });
  };

  const broadcastMatchNotification = (userId, matchData) => {
    io.to(`user_${userId}`).emit('match_notification', matchData);
  };

  return { io, broadcastNewMessage, broadcastMatchNotification, tempChatMessageCount };
};

module.exports = initSocket;