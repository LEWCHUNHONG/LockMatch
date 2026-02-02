// app.js
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
require('dotenv').config();


const connection = require('./db/connection');
const { upload, avatarUpload, chatMediaUpload, postMediaUpload } = require('./config/upload');
const authMiddleware = require('./middleware/auth');
const { buildAvatarUrl } = require('./utils/helpers');
const initSocket = require('./socket/socket');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const friendsRoutes = require('./routes/friends');
const chatRoutes = require('./routes/chat');
const groupRoutes = require('./routes/group');
const rewardsRoutes = require('./routes/rewards');
const discussRoutes = require('./routes/discuss');

const path = require('path');
const app = express();
const PORT = 3000;
const JWT_SECRET = 'lockmatch2026_super_strong_key';
const BASE_URL = process.env.BASE_URL;

// CORS 和其他中間件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 連線 MySQL
connection.connect(err => {
  if (err) {
    console.error('MySQL 連線失敗:', err);
    return;
  }
  console.log('MySQL 連線成功！API 已就緒');
});

// Socket.io 初始化
const httpServer = createServer(app);
const { io, broadcastNewMessage } = initSocket(httpServer, connection, BASE_URL, JWT_SECRET);

// auth 路由
app.use('/api', authRoutes(connection, authMiddleware, buildAvatarUrl, JWT_SECRET));

// user 路由
app.use('/api', userRoutes(connection, authMiddleware, buildAvatarUrl, avatarUpload, JWT_SECRET));

//chat 路由
app.use('/api', friendsRoutes(connection, authMiddleware, JWT_SECRET, buildAvatarUrl, BASE_URL, io));
app.use('/api', chatRoutes(connection, authMiddleware, JWT_SECRET, buildAvatarUrl, BASE_URL, chatMediaUpload, broadcastNewMessage, io));
app.use('/api', groupRoutes(connection, authMiddleware, JWT_SECRET, buildAvatarUrl, BASE_URL, chatMediaUpload, broadcastNewMessage, io));

//rewards 路由
app.use('/api', rewardsRoutes(connection, authMiddleware, JWT_SECRET));

//discuss 路由
app.use('/api', discussRoutes(connection, authMiddleware, JWT_SECRET, buildAvatarUrl, BASE_URL, postMediaUpload));

// 健康檢查路由
app.use('/api', healthRoutes(connection));

// 啟動伺服器
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`後端 API 運行中 → http://localhost:${PORT}`);
  console.log(`健康檢查：${BASE_URL}/api/health`);
});