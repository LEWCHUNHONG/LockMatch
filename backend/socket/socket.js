// socket/socket.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

module.exports = (httpServer, connection, BASE_URL, JWT_SECRET) => {
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

    // 使用回調更新在線狀態
    connection.query(
      'UPDATE users SET last_active = NOW(), online_status = "online" WHERE id = ?',
      [socket.userId],
      (err) => {
        if (err) console.error('更新在線狀態失敗:', err);
      }
    );

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
        'UPDATE users SET last_active = NOW(), online_status = "offline" WHERE id = ?',
        [socket.userId],
        (err) => {
          if (err) console.error('更新離線狀態失敗:', err);
        }
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

  return { io, broadcastNewMessage, broadcastMatchNotification };
};