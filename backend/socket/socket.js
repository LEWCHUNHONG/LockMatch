// socket/socket.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

module.exports = (httpServer, connection, BASE_URL, JWT_SECRET) => {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  // ── 新增：Socket 連線驗證 middleware ──
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      console.log('Socket 連線拒絕：缺少 token');
      return next(new Error('Authentication error: token required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // 綁定到 socket 上（之後所有事件都可直接用）
      socket.user = decoded;               // 完整 decoded payload
      socket.userId = decoded.id || decoded.userId;     // 依你的 token payload 調整
      socket.username = decoded.username || decoded.name || '未知用戶';

      console.log(`Socket 驗證成功 - 用戶: ${socket.username} (${socket.userId})`);
      next();
    } catch (err) {
      console.error('Socket JWT 驗證失敗:', err.message);
      next(new Error('Authentication error: invalid token'));
    }
  });

  // ── connection 事件 ──
  io.on('connection', (socket) => {
    console.log('新用戶連線:', socket.id, '| 用戶:', socket.username || '(未驗證)');

    // 加入聊天室
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`用戶 ${socket.username || '未知'} 加入房間 ${roomId}`);

      socket.to(roomId).emit('user-joined', {
        userId: socket.userId,
        username: socket.username || '未知用戶',
        timestamp: new Date()
      });
    });

    // 離開聊天室
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      console.log(`用戶 ${socket.username || '未知'} 離開房間 ${roomId}`);
    });

    // 打字指示器（已有的兜底可保留，但現在應該有真實 username）
    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      socket.to(roomId).emit('user-typing', {
        userId: socket.userId,
        username: socket.username || '未知用戶',
        isTyping: isTyping
      });
    });

    // 消息已讀
    socket.on('message-read', (data) => {
      const { roomId, messageId } = data;
      socket.to(roomId).emit('message-read-receipt', {
        userId: socket.userId,
        username: socket.username || '未知用戶',
        messageId: messageId,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`用戶 ${socket.username || '未知'} 斷開連接，原因: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket 錯誤 (用戶 ${socket.username || '未知'}):`, error);
    });
  });

  // broadcastNewMessage 保持不變
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

  return { io, broadcastNewMessage };
};