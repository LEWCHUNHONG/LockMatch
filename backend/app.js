// app.js
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
require('dotenv').config();
const os = require('os');

const connection = require('./db/connection');
const authMiddleware = require('./middleware/auth');
const { upload, avatarUpload, chatMediaUpload, postMediaUpload } = require('./config/upload');
const { buildAvatarUrl } = require('./utils/helpers');
const initSocket = require('./socket/socket');


const aiChatRouter = require('./routes/aiChat');
const aiMatchingRouter = require('./routes/aiMatching');
const friendRoutes = require('./routes/friendRoutes');
const groupInviteRoutes = require('./routes/groupInviteRoutes');
const insightsRouter = require('./routes/insights');


const tempChatRoutes = require('./routes/tempChatRoutes');

const scenarioRoutes = require('./routes/scenario');

const instantChatRoutes = require('./routes/instantChat');


const healthRoutes = require('./routes/health');
const userRoutes = require('./routes/user');
const friendsRoutes = require('./routes/friends');
const chatRoutes = require('./routes/chat');
const groupRoutes = require('./routes/group');
const rewardsRoutes = require('./routes/rewards');
const discussRoutes = require('./routes/discuss');
const gameRoutes = require('./routes/game');
const customLevelsRoutes = require('./routes/customLevels');

const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const BASE_URL = process.env.BASE_URL;

// 獲取所有網路接口信息
const networkInterfaces = os.networkInterfaces();
const availableIPs = [];

const httpServer = createServer(app);
const { io, broadcastNewMessage } = initSocket(httpServer, connection, BASE_URL, JWT_SECRET);
app.set('io', io);

app.set('broadcastNewMessage', broadcastNewMessage);

Object.keys(networkInterfaces).forEach((ifname) => {
  networkInterfaces[ifname].forEach((iface) => {
    if ('IPv4' !== iface.family || iface.internal !== false) return;
    availableIPs.push(iface.address);
  });
});

console.log('\n🔧 伺服器配置:');
console.log('  PORT:', PORT);
console.log('  BASE_URL:', BASE_URL);
console.log('  JWT_SECRET:', JWT_SECRET ? '已設置' : '未設置');
console.log('🌐 可用網路接口:');
availableIPs.forEach(ip => {
  console.log(`    http://${ip}:${PORT}`);
});


app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 靜態文件服務
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// 請求日誌中間件
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? '有 Token' : '無 Token'
    }
  });
  next();
});

// 連線 MySQL
connection.connect(err => {
  if (err) {
    console.error('❌ MySQL 連線失敗:', err);
    process.exit(1);
  }
  console.log('✅ MySQL 連線成功!API 已就緒');
});

// 處理 MySQL 連接錯誤
connection.on('error', (err) => {
  console.error('❌ MySQL 錯誤:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('❌ 數據庫連接丟失');
  } else {
    throw err;
  }
});



// auth 路由
const authRoutes = require('./routes/auth')(
  connection,
  authMiddleware,
  buildAvatarUrl,
  JWT_SECRET
);
app.use('/api', authRoutes);

app.use('/api/ai-chat', aiChatRouter);

app.use('/api/ai', aiMatchingRouter);

app.use('/api/friends', friendRoutes);

app.use('/api', friendRoutes);

app.use('/api', groupInviteRoutes);

app.use('/api/insights', insightsRouter);

// user 路由
app.use('/api', userRoutes(connection, authMiddleware, buildAvatarUrl, avatarUpload, JWT_SECRET, BASE_URL));

// chat 路由
app.use('/api', friendsRoutes(connection, authMiddleware, JWT_SECRET, buildAvatarUrl, BASE_URL, io));
app.use('/api', chatRoutes(connection, authMiddleware, JWT_SECRET, buildAvatarUrl, BASE_URL, chatMediaUpload, broadcastNewMessage, io));
app.use('/api', groupRoutes(connection, authMiddleware, JWT_SECRET, buildAvatarUrl, BASE_URL, chatMediaUpload, broadcastNewMessage, io));

// rewards 路由
app.use('/api', rewardsRoutes(connection, authMiddleware, JWT_SECRET));

// discuss 路由
app.use('/api', discussRoutes(connection, authMiddleware, JWT_SECRET, buildAvatarUrl, BASE_URL, postMediaUpload));

// 遊戲路由 - 重要:必須啟用
app.use('/api', gameRoutes(connection, authMiddleware, JWT_SECRET, BASE_URL));

// 自定義關卡路由
app.use('/api/custom-levels', customLevelsRoutes(connection, authMiddleware, JWT_SECRET));

// 健康檢查路由
app.use('/api', healthRoutes(connection));

app.use('/api/temp-chat', tempChatRoutes);

app.use('/api/scenario', scenarioRoutes);

app.use('/api/instant-chat', instantChatRoutes);


app.use('/api/user/location', require('./routes/location'));
app.use('/api/nearby-users', require('./routes/nearby'));



// 404 處理
app.use((req, res) => {
  console.log('❌ 404 未找到路由:', req.method, req.path);
  res.status(404).json({
    success: false,
    error: '路由不存在',
    path: req.path,
    method: req.method
  });
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('❌ 伺服器錯誤:', err);
  res.status(500).json({
    success: false,
    error: '伺服器內部錯誤',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 啟動伺服器
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🚀 後端 API 運行中');
  console.log('='.repeat(60));
  console.log(`  本地訪問: http://localhost:${PORT}`);
  console.log(`  基礎地址: ${BASE_URL}`);
  console.log('  可用地址:');
  availableIPs.forEach(ip => {
    console.log(`    http://${ip}:${PORT}`);
  });
  console.log(`  健康檢查: ${BASE_URL}/api/health`);
  console.log(`  心跳API: POST ${BASE_URL}/api/heartbeat`);
  console.log(`  更新 MBTI: PUT ${BASE_URL}/api/update-mbti`);
  console.log('='.repeat(60));
  console.log('');
});

// 關閉
process.on('SIGTERM', () => {
  console.log('📛 收到 SIGTERM 信號，準備關閉伺服器...');
  httpServer.close(() => {
    console.log('✅ 伺服器已關閉');
    connection.end(() => {
      console.log('✅ MySQL 連接已關閉');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('\n📛 收到 SIGINT 信號，準備關閉伺服器...');
  httpServer.close(() => {
    console.log('✅ 伺服器已關閉');
    connection.end(() => {
      console.log('✅ MySQL 連接已關閉');
      process.exit(0);
    });
  });
});

module.exports = app;