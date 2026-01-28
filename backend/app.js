const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'lockmatch2026_super_strong_key';
const BASE_URL = 'http://192.168.1.11:3000';

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MySQL 連線
const connection = mysql.createConnection({
  host: '192.168.1.222',
  port: '3308',
  user: 'root',
  password: 'lkw988667',
  database: 'mufyp'
});

connection.connect(err => {
  if (err) {
    console.error('MySQL 連線失敗:', err);
    return;
  }
  console.log('MySQL 連線成功！API 已就緒');
});

// ==================== 檔案上傳設定 ====================
// 頭像上傳目錄
const avatarDir = path.join(__dirname, 'uploads/avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// 聊天多媒體上傳目錄
const chatMediaDir = path.join(__dirname, 'uploads/chat_media');
if (!fs.existsSync(chatMediaDir)) {
  fs.mkdirSync(chatMediaDir, { recursive: true });
}

// 創建子目錄
['images', 'audio', 'videos', 'files'].forEach(subDir => {
  const dir = path.join(chatMediaDir, subDir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 討論區媒體上傳目錄
const postMediaDir = path.join(__dirname, 'uploads/post_media');
if (!fs.existsSync(postMediaDir)) {
  fs.mkdirSync(postMediaDir, { recursive: true });
}

// 創建子目錄
['images', 'videos'].forEach(subDir => {
  const dir = path.join(postMediaDir, subDir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 討論區媒體上傳配置
const postMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = file.mimetype.split('/')[0];
    let subDir = 'images';
    if (type === 'video') subDir = 'videos';
    const dir = path.join(postMediaDir, subDir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `post_${userId}_${timestamp}${ext}`);
  }
});

// 檔案過濾器（僅允許圖片和影片）
const postMediaFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('僅允許上傳圖片或影片'));
  }
};

// 創建上傳實例
const uploadPostMedia = multer({
  storage: postMediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: postMediaFilter
}).array('media', 10);

// 靜態文件服務（添加討論區媒體）
app.use('/uploads/post_media', express.static(postMediaDir));

// 頭像上傳配置
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'unknown';
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `user_${userId}_${Date.now()}${ext}`);
  }
});

// 多媒體上傳配置
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = file.mimetype.split('/')[0];
    let subDir = 'files';
    
    if (type === 'image') subDir = 'images';
    else if (type === 'audio') subDir = 'audio';
    else if (type === 'video') subDir = 'videos';
    
    const dir = path.join(chatMediaDir, subDir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `user_${userId}_${timestamp}_${safeFileName}`);
  }
});

// 檔案過濾器
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('僅允許上傳圖片檔案（jpg, jpeg, png, gif, webp）'));
  }
};

const mediaFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
    'application/pdf', 'application/msword', 'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支援的文件類型'));
  }
};

// 創建上傳實例
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter
});

const uploadMedia = multer({
  storage: mediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: mediaFilter
});

// 添加跨域頭部中間件
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
});

// 靜態文件服務 - 修復多設備訪問問題
app.use('/uploads/avatars', express.static(avatarDir, {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=86400'); // 緩存1天
  }
}));

app.use('/uploads/chat_media', express.static(chatMediaDir, {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=86400');
  }
}));

// ==================== JWT 驗證 Middleware ====================
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登入' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: '登入過期' });
    req.user = decoded;
    
    // 更新用戶最後活動時間
    if (decoded.id) {
      connection.query(
        'UPDATE users SET last_active = NOW() WHERE id = ?',
        [decoded.id],
        (err) => {
          if (err) console.error('更新最後活動時間失敗:', err);
        }
      );
    }
    
    next();
  });
};

// ==================== 輔助函數：構建完整頭像URL ====================
const buildAvatarUrl = (avatarPath) => {
  if (!avatarPath) {
    return `${BASE_URL}/uploads/avatars/default.png?cb=${Date.now()}`;
  }
  
  // 如果已經是完整URL，直接返回
  if (avatarPath.startsWith('http')) {
    return avatarPath.includes('?cb=') ? avatarPath : `${avatarPath}?cb=${Date.now()}`;
  }
  
  // 確保有斜杠開頭
  if (!avatarPath.startsWith('/')) {
    avatarPath = '/' + avatarPath;
  }
  
  // 構建完整URL並添加cache buster
  return `${BASE_URL}${avatarPath}?cb=${Date.now()}`;
};

// ==================== Socket.io 配置 ====================
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.io 中間件 - 驗證 token
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    console.error('Socket 連接失敗: 未提供 token');
    return next(new Error('未授權'));
  }
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('Socket 驗證失敗:', err.message);
      return next(new Error('認證失敗'));
    }
    
    socket.userId = decoded.id;
    socket.username = decoded.username;
    console.log(`Socket 用戶驗證成功: ${socket.username} (${socket.userId})`);
    next();
  });
});

// Socket.io 連接處理
io.on('connection', (socket) => {
  console.log(`用戶 ${socket.username} (${socket.userId}) 已連接, Socket ID: ${socket.id}`);
  
  // 用戶連接時，加入其個人房間（用於私聊）
  socket.join(`user_${socket.userId}`);
  
  // 加入聊天室
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`用戶 ${socket.username} 加入房間 ${roomId}`);
    
    // 通知房間內其他用戶有新成員加入（可選）
    socket.to(roomId).emit('user-joined', {
      userId: socket.userId,
      username: socket.username,
      timestamp: new Date()
    });
  });
  
  // 離開聊天室
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`用戶 ${socket.username} 離開房間 ${roomId}`);
  });
  
  // 用戶打字指示器
  socket.on('typing', (data) => {
    const { roomId, isTyping } = data;
    socket.to(roomId).emit('user-typing', {
      userId: socket.userId,
      username: socket.username,
      isTyping: isTyping
    });
  });
  
  // 消息已讀回執
  socket.on('message-read', (data) => {
    const { roomId, messageId } = data;
    socket.to(roomId).emit('message-read-receipt', {
      userId: socket.userId,
      username: socket.username,
      messageId: messageId,
      timestamp: new Date()
    });
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`用戶 ${socket.username} 斷開連接，原因: ${reason}`);
  });
  
  socket.on('error', (error) => {
    console.error(`Socket 錯誤 (用戶 ${socket.username}):`, error);
  });
});

// 輔助函數：廣播新消息到房間
const broadcastNewMessage = (roomId, message, senderId) => {
  // 確保圖片URL是完整路徑
  let messageToBroadcast = { ...message };
  
  if (messageToBroadcast.message_type === 'image' && messageToBroadcast.content) {
    let content = messageToBroadcast.content;
    // 如果沒有斜杠開頭，加上斜杠
    if (!content.startsWith('/')) {
      content = '/' + content;
    }
    // 確保是完整URL
    messageToBroadcast.content = `${BASE_URL}${content}`;
  }
  
  // 廣播消息到房間
  io.to(roomId).emit('new-message', {
    ...messageToBroadcast,
    is_own: false // 接收者設置為false，發送者在前端會單獨處理
  });
  
  // 如果需要，也可以發送給發送者自己（用於同步）
  io.to(`user_${senderId}`).emit('message-sent', {
    ...messageToBroadcast,
    is_own: true
  });
};

// ==================== 註冊 API ====================
app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: '請填寫完整資訊' });
  }

  connection.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, results) => {
    if (err) return res.status(500).json({ error: '資料庫錯誤' });
    if (results.length > 0) return res.status(400).json({ error: '帳號或信箱已存在' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    connection.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, hashedPassword, email], (err, result) => {
      if (err) return res.status(500).json({ error: '註冊失敗' });

      const newUserId = result.insertId;
      const token = jwt.sign({ id: newUserId, username }, JWT_SECRET, { expiresIn: '30d' });

      connection.query(
        'SELECT id, username, email, avatar FROM users WHERE id = ?', 
        [newUserId], 
        (err, userResults) => {
          if (err) return res.status(500).json({ error: '查詢使用者失敗' });
          
          const newUser = userResults[0];
          const avatarUrl = buildAvatarUrl(newUser.avatar);

          res.json({
            success: true,
            token,
            user: {
              id: newUser.id,
              username: newUser.username,
              email: newUser.email,
              avatar: avatarUrl
            }
          });
        }
      );
    });
  });
});

// ==================== 登入 API ====================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  connection.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err || results.length === 0) return res.status(400).json({ error: '帳號或密碼錯誤' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: '帳號或密碼錯誤' });

    // 更新最後活動時間
    connection.query('UPDATE users SET last_active = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    const avatarUrl = buildAvatarUrl(user.avatar);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: avatarUrl
      }
    });
  });
});

// ==================== 更新個人資料 ====================
app.put('/api/update-profile', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { username, email, currentPassword, newPassword, mbti, status } = req.body;

  connection.query('SELECT * FROM users WHERE id = ?', [userId], async (err, results) => {
    if (err || results.length === 0) return res.status(500).json({ error: '使用者不存在' });
    const user = results[0];

    // 若要改密碼，需驗證舊密碼
    if (newPassword && currentPassword) {
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) return res.status(400).json({ error: '目前密碼錯誤' });
    }

    // 檢查 username 或 email 是否重複（排除自己）
    connection.query(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username || user.username, email || user.email, userId],
      async (err, results) => {
        if (err) return res.status(500).json({ error: '資料庫錯誤' });
        if (results.length > 0) return res.status(400).json({ error: '使用者名稱或信箱已被使用' });

        const fields = [];
        const values = [];

        if (username && username !== user.username) { fields.push('username = ?'); values.push(username); }
        if (email && email !== user.email) { fields.push('email = ?'); values.push(email); }
        if (mbti !== undefined && mbti !== user.mbti) { fields.push('mbti = ?'); values.push(mbti); }
        if (status !== undefined && status !== user.status) { fields.push('status = ?'); values.push(status); }
        if (newPassword) {
          const hashed = await bcrypt.hash(newPassword, 10);
          fields.push('password = ?'); values.push(hashed);
        }

        if (fields.length === 0) {
          // 即使沒有字段更新，也返回完整用戶信息
          connection.query(
            'SELECT id, username, email, avatar, mbti, status FROM users WHERE id = ?',
            [userId],
            (err, userResults) => {
              if (err || userResults.length === 0) return res.json({ success: true, message: '無變更' });
              
              const updatedUser = userResults[0];
              const avatarUrl = buildAvatarUrl(updatedUser.avatar);
              
              res.json({ 
                success: true, 
                message: '無變更',
                user: {
                  ...updatedUser,
                  avatar: avatarUrl
                }
              });
            }
          );
          return;
        }

        const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
        values.push(userId);

        connection.query(sql, values, (err) => {
          if (err) return res.status(500).json({ error: '更新失敗' });
          
          // 獲取更新後的用戶信息
          connection.query(
            'SELECT id, username, email, avatar, mbti, status FROM users WHERE id = ?',
            [userId],
            (err, userResults) => {
              if (err) return res.json({ success: true, message: '更新成功' });
              
              const updatedUser = userResults[0];
              const avatarUrl = buildAvatarUrl(updatedUser.avatar);
              
              res.json({ 
                success: true, 
                message: '更新成功',
                user: {
                  ...updatedUser,
                  avatar: avatarUrl
                }
              });
            }
          );
        });
      }
    );
  });
});

// ==================== 專用 API：更新 MBTI 結果 ====================
app.post('/api/update-mbti', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { mbti } = req.body;
  
  if (!mbti || !/^[IE][SN][TF][JP]$/.test(mbti)) {
    return res.status(400).json({ error: '無效的 MBTI 類型' });
  }
  
  connection.query(
    'UPDATE users SET mbti = ? WHERE id = ?',
    [mbti, userId],
    (err, result) => {
      if (err) {
        console.error('更新 MBTI 失敗:', err);
        return res.status(500).json({ error: '更新失敗' });
      }
      
      // 同時更新狀態為已測試
      connection.query(
        'UPDATE users SET status = ? WHERE id = ?',
        ['已測試', userId],
        (err) => {
          if (err) console.error('更新狀態失敗:', err);
        }
      );
      
      // 獲取更新後的用戶信息
      connection.query(
        'SELECT id, username, email, avatar, mbti, status FROM users WHERE id = ?',
        [userId],
        (err, userResults) => {
          if (err) return res.status(500).json({ error: '查詢用戶信息失敗' });
          
          const updatedUser = userResults[0];
          const avatarUrl = buildAvatarUrl(updatedUser.avatar);
          
          res.json({ 
            success: true, 
            message: 'MBTI 更新成功',
            user: {
              ...updatedUser,
              avatar: avatarUrl
            }
          });
        }
      );
    }
  );
});

// ==================== 根據 MBTI 匹配用戶 ====================
app.get('/api/mbti-matches', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  // 先獲取當前用戶的 MBTI
  connection.query(
    'SELECT mbti FROM users WHERE id = ?',
    [userId],
    (err, results) => {
      if (err || results.length === 0 || !results[0].mbti) {
        return res.json({ success: true, matches: [], message: '請先完成 MBTI 測試' });
      }
      
      const userMbti = results[0].mbti;
      
      // 根據 MBTI 匹配邏輯獲取推薦用戶
      connection.query(
        `SELECT 
          u.id,
          u.username,
          u.avatar,
          u.mbti,
          u.status,
          u.last_active,
          (TIMESTAMPDIFF(MINUTE, u.last_active, NOW()) < 5) as is_online,
          CASE 
            WHEN u.mbti = ? THEN 100
            WHEN LEFT(u.mbti, 1) = LEFT(?, 1) THEN 80
            WHEN RIGHT(u.mbti, 1) = RIGHT(?, 1) THEN 60
            ELSE 40
          END as match_score
        FROM users u
        WHERE u.id != ? 
          AND u.mbti IS NOT NULL
          AND u.mbti != ''
        ORDER BY match_score DESC, u.last_active DESC
        LIMIT 20`,
        [userMbti, userMbti, userMbti, userId],
        (err, matchResults) => {
          if (err) {
            console.error('獲取 MBTI 匹配失敗:', err);
            return res.status(500).json({ error: '獲取匹配失敗' });
          }
          
          // 處理頭像URL
          const formattedMatches = matchResults.map(user => ({
            ...user,
            avatar: buildAvatarUrl(user.avatar)
          }));
          
          res.json({ 
            success: true, 
            matches: formattedMatches,
            userMbti: userMbti
          });
        }
      );
    }
  );
});

// ==================== 驗證 token & 取得目前使用者資訊 ====================
app.get('/api/me', authenticateToken, (req, res) => {
  connection.query(
    'SELECT id, username, email, avatar, mbti, status, last_active FROM users WHERE id = ?',
    [req.user.id],
    (err, results) => {
      if (err || results.length === 0) return res.status(404).json({ error: '使用者不存在' });
      const user = results[0];
      
      // 計算在線狀態
      const lastActive = new Date(user.last_active);
      const now = new Date();
      const diffMinutes = (now - lastActive) / (1000 * 60);
      const isOnline = diffMinutes < 5;
      
      const avatarUrl = buildAvatarUrl(user.avatar);
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: avatarUrl,
          mbti: user.mbti,
          status: user.status,
          last_active: user.last_active,
          is_online: isOnline
        }
      });
    }
  );
});

// ==================== 上傳頭像 API ====================
app.post('/api/upload-avatar', authenticateToken, uploadAvatar.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '請上傳圖片檔案' });
  }

  const newAvatarPath = `/uploads/avatars/${req.file.filename}`;
  const avatarUrl = buildAvatarUrl(newAvatarPath);

  // 先查詢目前資料庫中的舊頭像路徑
  connection.query(
    'SELECT avatar FROM users WHERE id = ?',
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error('查詢舊頭像失敗:', err);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      const oldAvatar = results[0]?.avatar;

      // 更新資料庫為新頭像
      connection.query(
        'UPDATE users SET avatar = ? WHERE id = ?',
        [newAvatarPath, req.user.id],
        (err) => {
          if (err) {
            console.error('更新頭像失敗:', err);
            return res.status(500).json({ error: '更新頭像失敗' });
          }

          // 刪除舊頭像檔案
          if (oldAvatar && 
              !oldAvatar.includes('default.png') && 
              oldAvatar !== newAvatarPath) {
            
            const oldFilePath = path.join(__dirname, oldAvatar);
            
            fs.unlink(oldFilePath, (unlinkErr) => {
              if (unlinkErr) {
                console.warn('無法刪除舊頭像檔案:', oldAvatar, unlinkErr);
              } else {
                console.log('成功刪除舊頭像:', oldAvatar);
              }
            });
          }

          res.json({ success: true, avatar: avatarUrl });
        }
      );
    }
  );
});

// ==================== 刪除頭像 API ====================
app.delete('/api/delete-avatar', authenticateToken, (req, res) => {
  connection.query('SELECT avatar FROM users WHERE id = ?', [req.user.id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(500).json({ error: '查詢失敗' });
    }

    const currentAvatar = results[0].avatar;

    // 如果當前就是預設頭像，就不用刪
    if (!currentAvatar || currentAvatar.includes('default.png')) {
      const defaultUrl = buildAvatarUrl('/uploads/avatars/default.png');
      return res.json({ success: true, message: '已是預設頭像', avatar: defaultUrl });
    }

    // 更新資料庫為預設頭像
    const defaultPath = '/uploads/avatars/default.png';
    const defaultUrl = buildAvatarUrl(defaultPath);
    
    connection.query('UPDATE users SET avatar = ? WHERE id = ?', [defaultPath, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: '更新失敗' });

      // 刪除實體檔案
      const filePath = path.join(__dirname, currentAvatar);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error('刪除舊頭像檔案失敗:', err);
        });
      }

      res.json({ success: true, avatar: defaultUrl });
    });
  });
});

// ==================== 聊天相關 API ====================

// 獲取聊天室列表
app.get('/api/chat-rooms', authenticateToken, (req, res) => {
  connection.query(
    `SELECT 
      cr.id,
      cr.name,
      cr.type,
      cr.description,
      cr.created_at,
      cr.last_activity,
      COUNT(DISTINCT crm.user_id) as members_count,
      MAX(m.created_at) as last_message_time,
      COALESCE(
        (SELECT content FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1),
        '還沒有訊息'
      ) as last_message,
      COALESCE(
        (SELECT message_type FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1),
        'text'
      ) as last_message_type,
      (SELECT COUNT(*) FROM messages WHERE room_id = cr.id AND sender_id != ? AND id > (
        SELECT IFNULL(MAX(message_id), 0) FROM chat_room_reads WHERE user_id = ? AND room_id = cr.id
      )) as unread_count,
      CASE 
        WHEN cr.type = 'private' THEN (
          SELECT u.avatar FROM users u
          JOIN chat_room_members crm2 ON u.id = crm2.user_id
          WHERE crm2.room_id = cr.id AND crm2.user_id != ?
          LIMIT 1
        )
        ELSE cr.avatar
      END as avatar,
      CASE 
        WHEN cr.type = 'private' THEN (
          SELECT TIMESTAMPDIFF(MINUTE, u.last_active, NOW()) < 5 FROM users u
          JOIN chat_room_members crm2 ON u.id = crm2.user_id
          WHERE crm2.room_id = cr.id AND crm2.user_id != ?
          LIMIT 1
        )
        ELSE FALSE
      END as is_online,
      CASE 
        WHEN cr.type = 'private' THEN (
          SELECT u.username FROM users u
          JOIN chat_room_members crm2 ON u.id = crm2.user_id
          WHERE crm2.room_id = cr.id AND crm2.user_id != ?
          LIMIT 1
        )
        ELSE NULL
      END as other_user_name
    FROM chat_rooms cr
    JOIN chat_room_members crm ON cr.id = crm.room_id
    LEFT JOIN messages m ON cr.id = m.room_id
    WHERE crm.user_id = ?
    GROUP BY cr.id
    ORDER BY COALESCE(cr.last_activity, cr.created_at) DESC`,
    [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id],
    (err, results) => {
      if (err) {
        console.error('獲取聊天室列表失敗:', err);
        return res.status(500).json({ error: '取得聊天室失敗' });
      }
      
      // 格式化數據
      const formattedRooms = results.map(room => {
        let displayName = room.name;
        
        // 如果是私聊且沒有其他用戶名，使用默認名稱
        if (room.type === 'private') {
          if (!room.other_user_name || room.other_user_name === 'unknown') {
            displayName = '未知用戶';
          } else {
            displayName = room.other_user_name;
          }
        }
        
        // 格式化最後消息時間
        let lastTime = '還沒有訊息';
        if (room.last_message_time) {
          const date = new Date(room.last_message_time);
          const now = new Date();
          const diffMs = now - date;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);
          
          if (diffMins < 1) lastTime = '剛剛';
          else if (diffMins < 60) lastTime = `${diffMins}分鐘前`;
          else if (diffHours < 24) lastTime = `${diffHours}小時前`;
          else if (diffDays === 1) lastTime = '昨天';
          else if (diffDays < 7) lastTime = `${diffDays}天前`;
          else {
            lastTime = date.toLocaleDateString('zh-TW', { 
              month: 'short', 
              day: 'numeric'
            });
          }
        } else if (room.last_activity) {
          const date = new Date(room.last_activity);
          lastTime = date.toLocaleDateString('zh-TW', { 
            month: 'short', 
            day: 'numeric'
          });
        }
        
        // 處理頭像URL
        const avatarUrl = buildAvatarUrl(room.avatar);
        
        return {
          id: room.id,
          name: displayName,
          type: room.type,
          description: room.description,
          members_count: room.members_count,
          avatar: avatarUrl,
          is_online: Boolean(room.is_online),
          last_activity: room.last_activity,
          last_message: room.last_message,
          last_message_time: room.last_message_time,
          last_message_type: room.last_message_type,
          unread_count: room.unread_count || 0,
          last_time: lastTime
        };
      });
      
      res.json({ success: true, rooms: formattedRooms });
    }
  );
});

// 獲取聊天室詳情
app.get('/api/chat-room/:roomId', authenticateToken, (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  
  console.log(`[DEBUG] 獲取聊天室詳情: userId=${userId}, roomId=${roomId}`);
  
  connection.query(
    `SELECT 
      cr.*,
      COUNT(DISTINCT crm.user_id) as members_count,
      CASE 
        WHEN cr.type = 'private' THEN (
          SELECT u.username FROM users u
          JOIN chat_room_members crm2 ON u.id = crm2.user_id
          WHERE crm2.room_id = cr.id AND crm2.user_id != ?
          LIMIT 1
        )
        ELSE NULL
      END as other_user_name,
      CASE 
        WHEN cr.type = 'private' THEN (
          SELECT u.avatar FROM users u
          JOIN chat_room_members crm2 ON u.id = crm2.user_id
          WHERE crm2.room_id = cr.id AND crm2.user_id != ?
          LIMIT 1
        )
        ELSE cr.avatar
      END as avatar,
      CASE 
        WHEN cr.type = 'private' THEN (
          SELECT u.mbti FROM users u
          JOIN chat_room_members crm2 ON u.id = crm2.user_id
          WHERE crm2.room_id = cr.id AND crm2.user_id != ?
          LIMIT 1
        )
        ELSE NULL
      END as mbti,
      CASE 
        WHEN cr.type = 'private' THEN (
          SELECT TIMESTAMPDIFF(MINUTE, u.last_active, NOW()) < 5 FROM users u
          JOIN chat_room_members crm2 ON u.id = crm2.user_id
          WHERE crm2.room_id = cr.id AND crm2.user_id != ?
          LIMIT 1
        )
        ELSE FALSE
      END as is_online
    FROM chat_rooms cr
    LEFT JOIN chat_room_members crm ON cr.id = crm.room_id
    WHERE cr.id = ?
    GROUP BY cr.id`,
    [userId, userId, userId, userId, roomId],
    (err, results) => {
      if (err) {
        console.error('[ERROR] 獲取聊天室詳情失敗:', err);
        return res.status(500).json({ error: '伺服器錯誤' });
      }
      
      if (results.length === 0) {
        console.log(`[WARN] 聊天室不存在: roomId=${roomId}`);
        return res.status(404).json({ error: '聊天室不存在' });
      }
      
      const room = results[0];
      room.is_online = Boolean(room.is_online);
      
      if (room.type === 'private' && room.other_user_name) {
        room.name = room.other_user_name;
      }
      
      // 處理頭像URL
      const avatarUrl = buildAvatarUrl(room.avatar);
      
      res.json({
        success: true,
        room: {
          id: room.id,
          name: room.name,
          type: room.type,
          members_count: room.members_count,
          description: room.description,
          avatar: avatarUrl,
          mbti: room.mbti,
          is_online: room.is_online,
        }
      });
    }
  );
});

// 獲取聊天消息
app.get('/api/chat-messages/:roomId', authenticateToken, (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  
  console.log(`[DEBUG] 獲取聊天消息: userId=${userId}, roomId=${roomId}`);
  
  // 更嚴格的權限檢查流程
  connection.beginTransaction(err => {
    if (err) {
      console.error('[ERROR] 事務開始失敗:', err);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
    
    // 1. 檢查聊天室是否存在
    connection.query(
      'SELECT id, type, name FROM chat_rooms WHERE id = ?',
      [roomId],
      (err, roomResults) => {
        if (err) {
          console.error('[ERROR] 檢查聊天室失敗:', err);
          return connection.rollback(() => {
            res.status(500).json({ error: '伺服器錯誤' });
          });
        }
        
        if (roomResults.length === 0) {
          console.log(`[WARN] 聊天室不存在: roomId=${roomId}`);
          return connection.rollback(() => {
            res.status(404).json({ 
              error: '聊天室不存在',
              code: 'ROOM_NOT_FOUND'
            });
          });
        }
        
        const room = roomResults[0];
        
        // 2. 檢查用戶是否在聊天室中
        connection.query(
          'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
          [roomId, userId],
          (err, memberResults) => {
            if (err) {
              console.error('[ERROR] 檢查成員失敗:', err);
              return connection.rollback(() => {
                res.status(500).json({ error: '伺服器錯誤' });
              });
            }
            
            if (memberResults.length === 0) {
              console.log(`[WARN] 用戶不在聊天室中: userId=${userId}, roomId=${roomId}`);
              return connection.rollback(() => {
                res.status(403).json({ 
                  error: '無權限訪問此聊天室',
                  code: 'NOT_MEMBER',
                  roomName: room.name
                });
              });
            }

            // 3. 獲取消息
            connection.query(
              `SELECT 
                m.*, 
                u.username,
                u.avatar,
                m.message_type,
                m.file_name,
                m.file_size,
                (SELECT COUNT(*) FROM chat_room_reads WHERE message_id = m.id) as read_count,
                (SELECT COUNT(*) FROM chat_room_reads WHERE message_id = m.id AND user_id = ?) as is_read_by_me
              FROM messages m
              JOIN users u ON m.sender_id = u.id
              WHERE m.room_id = ?
              ORDER BY m.created_at ASC
              LIMIT 200`,
              [userId, roomId],
              (err, messageResults) => {
                if (err) {
                  console.error('[ERROR] 獲取消息失敗:', err);
                  return connection.rollback(() => {
                    res.status(500).json({ error: '取得訊息失敗' });
                  });
                }
                
                // 4. 更新最後已讀消息
                if (messageResults.length > 0) {
                  const lastMessageId = messageResults[messageResults.length - 1].id;
                  connection.query(
                    `INSERT INTO chat_room_reads (user_id, room_id, message_id, read_at)
                     VALUES (?, ?, ?, NOW())
                     ON DUPLICATE KEY UPDATE message_id = VALUES(message_id), read_at = NOW()`,
                    [userId, roomId, lastMessageId],
                    (err) => {
                      if (err) {
                        console.error('[WARN] 更新已讀狀態失敗:', err);
                        // 繼續執行，不影響主流程
                      }
                      
                      // 5. 提交事務
                      connection.commit(err => {
                        if (err) {
                          console.error('[ERROR] 提交事務失敗:', err);
                          return connection.rollback(() => {
                            res.status(500).json({ error: '伺服器錯誤' });
                          });
                        }
                        
                        // 修復圖片路徑，確保是完整URL
                        const fixedResults = messageResults.map(msg => {
                          // 處理發送者頭像
                          msg.avatar = buildAvatarUrl(msg.avatar);
                          
                          // 處理消息內容中的圖片
                          if (msg.message_type === 'image' && msg.content) {
                            // 確保圖片路徑是正確的完整URL格式
                            if (!msg.content.startsWith('http')) {
                              // 如果沒有斜杠開頭，加上斜杠
                              if (!msg.content.startsWith('/')) {
                                msg.content = '/' + msg.content;
                              }
                              // 轉換為完整URL
                              msg.content = `${BASE_URL}${msg.content}`;
                            }
                          }
                          return msg;
                        });
                        
                        console.log(`[DEBUG] 成功返回消息: count=${fixedResults.length}`);
                        
                        res.json({ 
                          success: true, 
                          messages: fixedResults,
                          roomInfo: {
                            id: room.id,
                            type: room.type,
                            name: room.name
                          }
                        });
                      });
                    }
                  );
                } else {
                  // 沒有消息，直接提交
                  connection.commit(err => {
                    if (err) {
                      console.error('[ERROR] 提交事務失敗:', err);
                      return connection.rollback(() => {
                        res.status(500).json({ error: '伺服器錯誤' });
                      });
                    }
                    
                    res.json({ 
                      success: true, 
                      messages: [],
                      roomInfo: {
                        id: room.id,
                        type: room.type,
                        name: room.name
                      }
                    });
                  });
                }
              }
            );
          }
        );
      }
    );
  });
});

// 發送文字消息（帶Socket廣播）
app.post('/api/send-message', authenticateToken, (req, res) => {
  const { roomId, content } = req.body;
  
  if (!roomId || !content || content.trim() === '') {
    return res.status(400).json({ error: '請輸入有效訊息' });
  }
  
  // 檢查用戶是否在聊天室中
  connection.query(
    'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
    [roomId, req.user.id],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(403).json({ error: '無權限在此聊天室發送訊息' });
      }
      
      connection.query(
        'INSERT INTO messages (room_id, sender_id, content, message_type) VALUES (?, ?, ?, "text")',
        [roomId, req.user.id, content.trim()],
        (err, result) => {
          if (err) {
            console.error('發送消息失敗:', err);
            return res.status(500).json({ error: '發送失敗' });
          }
          
          // 更新聊天室最後活動時間
          connection.query(
            'UPDATE chat_rooms SET last_activity = NOW() WHERE id = ?',
            [roomId],
            (err) => {
              if (err) console.error('更新聊天室活動時間失敗:', err);
            }
          );
          
          // 獲取完整的消息資料
          connection.query(
            `SELECT m.*, u.username, u.avatar 
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.id = ?`,
            [result.insertId],
            (err, messageResults) => {
              if (err) {
                return res.json({ success: true, messageId: result.insertId });
              }
              
              const message = messageResults[0];
              // 處理頭像URL
              message.avatar = buildAvatarUrl(message.avatar);
              
              // 廣播消息到房間（通過Socket.io）
              broadcastNewMessage(roomId, message, req.user.id);
              
              // 發送者自己也需要消息，但標記為自己的消息
              const responseMessage = {
                ...message,
                is_own: true
              };
              
              res.json({ 
                success: true, 
                messageId: result.insertId,
                message: responseMessage 
              });
            }
          );
        }
      );
    }
  );
});

// 發送多媒體消息（帶Socket廣播）
app.post('/api/send-media-message', authenticateToken, uploadMedia.single('file'), (req, res) => {
  const { roomId } = req.body;
  
  if (!roomId || !req.file) {
    console.error('缺少必要參數:', { roomId, hasFile: !!req.file });
    return res.status(400).json({ error: '缺少必要參數' });
  }
  
  // 檢查用戶是否在聊天室中
  connection.query(
    'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
    [roomId, req.user.id],
    (err, results) => {
      if (err || results.length === 0) {
        // 刪除已上傳的文件
        fs.unlink(req.file.path, () => {});
        return res.status(403).json({ error: '無權限在此聊天室發送訊息' });
      }
      
      // 正確構建文件路徑
      const fullPath = req.file.path;
      const fileName = req.file.filename;
      const fileType = req.file.mimetype.split('/')[0];
      const originalName = req.file.originalname;
      
      // 根據文件類型確定子目錄
      let subDir = 'files';
      if (fileType === 'image') subDir = 'images';
      else if (fileType === 'audio') subDir = 'audio';
      else if (fileType === 'video') subDir = 'videos';
      
      // 構建相對路徑 - 確保以/uploads/開頭
      const relativePath = `/uploads/chat_media/${subDir}/${fileName}`;
      
      console.log('上傳的文件信息:');
      console.log('- 相對路徑:', relativePath);
      console.log('- 文件類型:', fileType);
      console.log('- 原始文件名:', originalName);
      console.log('- 文件大小:', req.file.size);
      
      // 檢查文件是否存在
      if (!fs.existsSync(fullPath)) {
        console.error('文件不存在於:', fullPath);
        return res.status(500).json({ error: '文件上傳失敗' });
      }
      
      // 插入到數據庫
      connection.query(
        'INSERT INTO messages (room_id, sender_id, content, message_type, file_name, file_size) VALUES (?, ?, ?, ?, ?, ?)',
        [roomId, req.user.id, relativePath, fileType, originalName, req.file.size],
        (err, result) => {
          if (err) {
            console.error('發送多媒體消息失敗:', err);
            // 刪除已上傳的文件
            fs.unlink(fullPath, () => {});
            return res.status(500).json({ error: '發送失敗: ' + err.message });
          }
          
          // 更新聊天室最後活動時間
          connection.query(
            'UPDATE chat_rooms SET last_activity = NOW() WHERE id = ?',
            [roomId],
            (err) => {
              if (err) console.error('更新聊天室活動時間失敗:', err);
            }
          );
          
          console.log('成功插入消息，ID:', result.insertId);
          
          // 獲取完整的消息資料
          connection.query(
            `SELECT m.*, u.username, u.avatar 
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.id = ?`,
            [result.insertId],
            (err, messageResults) => {
              if (err) {
                return res.json({ 
                  success: true, 
                  messageId: result.insertId,
                  fileUrl: `${BASE_URL}${relativePath}`,
                  fileType: fileType,
                  fileName: originalName,
                  fileSize: req.file.size
                });
              }
              
              const message = messageResults[0];
              // 處理頭像URL
              message.avatar = buildAvatarUrl(message.avatar);
              // 處理文件URL
              message.content = `${BASE_URL}${relativePath}`;
              
              // 廣播消息到房間（通過Socket.io）
              broadcastNewMessage(roomId, message, req.user.id);
              
              res.json({ 
                success: true, 
                messageId: result.insertId,
                fileUrl: `${BASE_URL}${relativePath}`,
                fileType: fileType,
                fileName: originalName,
                fileSize: req.file.size,
                message: {
                  ...message,
                  is_own: true
                }
              });
            }
          );
        }
      );
    }
  );
});

// 標記消息為已讀
app.post('/api/mark-as-read', authenticateToken, (req, res) => {
  const { roomId, messageId } = req.body;
  
  if (!roomId || !messageId) {
    return res.status(400).json({ error: '缺少必要參數' });
  }
  
  connection.query(
    `INSERT INTO chat_room_reads (user_id, room_id, message_id, read_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE message_id = GREATEST(message_id, VALUES(message_id)), read_at = NOW()`,
    [req.user.id, roomId, messageId],
    (err) => {
      if (err) {
        console.error('標記已讀失敗:', err);
        return res.status(500).json({ error: '標記已讀失敗' });
      }
      
      // 通過Socket廣播已讀狀態
      io.to(roomId).emit('message-read', {
        userId: req.user.id,
        messageId: messageId,
        timestamp: new Date()
      });
      
      res.json({ success: true });
    }
  );
});

// 獲取消息已讀狀態
app.get('/api/message-read-status/:messageId', authenticateToken, (req, res) => {
  const { messageId } = req.params;
  
  connection.query(
    `SELECT u.id, u.username, u.avatar, crr.read_at
     FROM chat_room_reads crr
     JOIN users u ON crr.user_id = u.id
     WHERE crr.message_id = ?
     ORDER BY crr.read_at DESC`,
    [messageId],
    (err, results) => {
      if (err) {
        console.error('獲取已讀狀態失敗:', err);
        return res.status(500).json({ error: '獲取失敗' });
      }
      
      // 處理頭像URL
      const formattedResults = results.map(reader => ({
        ...reader,
        avatar: buildAvatarUrl(reader.avatar)
      }));
      
      res.json({ success: true, readers: formattedResults });
    }
  );
});

// ==================== 群組相關 API ====================

// 創建群組聊天室
app.post('/api/create-group', authenticateToken, (req, res) => {
  const { name, description, userIds } = req.body;
  
  if (!name || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: '請填寫群組名稱並選擇至少一名成員' });
  }
  
  // 確保當前用戶也在成員列表中
  const allUserIds = [req.user.id, ...userIds];
  const uniqueUserIds = [...new Set(allUserIds)];
  
  connection.beginTransaction(err => {
    if (err) return res.status(500).json({ error: '交易失敗' });
    
    // 創建群組聊天室
    connection.query(
      'INSERT INTO chat_rooms (name, type, description) VALUES (?, "group", ?)',
      [name, description || ''],
      (err, result) => {
        if (err) {
          return connection.rollback(() => {
            console.error('創建群組失敗:', err);
            res.status(500).json({ error: '創建群組失敗' });
          });
        }
        
        const roomId = result.insertId;
        
        // 批量添加成員
        const memberQueries = uniqueUserIds.map(userId => {
          return new Promise((resolve, reject) => {
            connection.query(
              'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
              [roomId, userId],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });
        
        Promise.all(memberQueries)
          .then(() => {
            connection.commit(err => {
              if (err) {
                return connection.rollback(() => {
                  res.status(500).json({ error: '提交失敗' });
                });
              }
              
              // 獲取完整的群組信息
              connection.query(
                'SELECT * FROM chat_rooms WHERE id = ?',
                [roomId],
                (err, results) => {
                  if (err || results.length === 0) {
                    return res.json({ success: true, roomId });
                  }
                  
                  const room = results[0];
                  const avatarUrl = buildAvatarUrl(room.avatar);
                  
                  // 獲取成員信息
                  connection.query(
                    `SELECT u.id, u.username, u.avatar, u.mbti, 
                     (TIMESTAMPDIFF(MINUTE, u.last_active, NOW()) < 5) as is_online
                     FROM users u
                     JOIN chat_room_members crm ON u.id = crm.user_id
                     WHERE crm.room_id = ?`,
                    [roomId],
                    (err, members) => {
                      if (err) {
                        return res.json({ success: true, roomId, room: { ...room, avatar: avatarUrl } });
                      }
                      
                      // 處理成員頭像URL
                      const formattedMembers = members.map(member => ({
                        ...member,
                        avatar: buildAvatarUrl(member.avatar),
                        is_online: Boolean(member.is_online)
                      }));
                      
                      // 通知所有成員新群組已創建（通過Socket）
                      uniqueUserIds.forEach(userId => {
                        io.to(`user_${userId}`).emit('group-created', {
                          roomId: roomId,
                          roomName: name,
                          createdBy: req.user.id
                        });
                      });
                      
                      res.json({
                        success: true,
                        roomId,
                        room: {
                          ...room,
                          avatar: avatarUrl,
                          members_count: formattedMembers.length,
                          members: formattedMembers
                        }
                      });
                    }
                  );
                }
              );
            });
          })
          .catch(err => {
            connection.rollback(() => {
              console.error('添加成員失敗:', err);
              res.status(500).json({ error: '添加成員失敗' });
            });
          });
      }
    );
  });
});

// 獲取群組成員列表
app.get('/api/group-members/:roomId', authenticateToken, (req, res) => {
  const { roomId } = req.params;
  
  connection.query(
    `SELECT 
      u.id,
      u.username,
      u.avatar,
      u.mbti,
      u.email,
      u.status,
      u.last_active,
      (TIMESTAMPDIFF(MINUTE, u.last_active, NOW()) < 5) as is_online,
      crm.joined_at,
      CASE 
        WHEN u.id = ? THEN 'creator'
        ELSE 'member'
      END as role
    FROM users u
    JOIN chat_room_members crm ON u.id = crm.user_id
    WHERE crm.room_id = ?
    ORDER BY 
      CASE WHEN u.id = ? THEN 0 ELSE 1 END,
      crm.joined_at ASC`,
    [req.user.id, roomId, req.user.id],
    (err, results) => {
      if (err) {
        console.error('獲取成員列表失敗:', err);
        return res.status(500).json({ error: '獲取成員失敗' });
      }
      
      // 格式化時間
      const formatTimeAgo = (timestamp) => {
        if (!timestamp) return '未知';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return '剛剛';
        if (diffMins < 60) return `${diffMins}分鐘前`;
        if (diffHours < 24) return `${diffHours}小時前`;
        if (diffDays === 1) return '昨天';
        if (diffDays < 7) return `${diffDays}天前`;
        
        return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
      };
      
      const formattedResults = results.map(member => ({
        ...member,
        avatar: buildAvatarUrl(member.avatar),
        is_online: Boolean(member.is_online),
        last_active: formatTimeAgo(member.last_active)
      }));
      
      res.json({ success: true, members: formattedResults });
    }
  );
});

// 添加群組成員
app.post('/api/add-group-member', authenticateToken, (req, res) => {
  const { roomId, userId } = req.body;
  
  if (!roomId || !userId) {
    return res.status(400).json({ error: '缺少必要參數' });
  }
  
  // 檢查聊天室是否存在且為群組
  connection.query(
    'SELECT type FROM chat_rooms WHERE id = ?',
    [roomId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: '聊天室不存在' });
      }
      
      if (results[0].type !== 'group') {
        return res.status(400).json({ error: '只能向群組添加成員' });
      }
      
      // 檢查用戶是否已在群組中
      connection.query(
        'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
        [roomId, userId],
        (err, results) => {
          if (err) return res.status(500).json({ error: '資料庫錯誤' });
          if (results.length > 0) return res.status(400).json({ error: '用戶已在群組中' });
          
          // 添加成員
          connection.query(
            'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
            [roomId, userId],
            (err) => {
              if (err) {
                console.error('添加成員失敗:', err);
                return res.status(500).json({ error: '添加成員失敗' });
              }
              
              // 通知用戶已被添加到群組（通過Socket）
              io.to(`user_${userId}`).emit('added-to-group', {
                roomId: roomId,
                roomName: results[0].name
              });
              
              // 通知群組其他成員有新成員加入
              io.to(roomId).emit('group-member-added', {
                roomId: roomId,
                userId: userId,
                addedBy: req.user.id
              });
              
              // 獲取用戶信息
              connection.query(
                'SELECT id, username, avatar, mbti FROM users WHERE id = ?',
                [userId],
                (err, userResults) => {
                  if (err) return res.json({ success: true });
                  
                  const user = userResults[0];
                  res.json({ 
                    success: true, 
                    user: {
                      ...user,
                      avatar: buildAvatarUrl(user.avatar),
                      is_online: false,
                      role: 'member'
                    }
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// 移除群組成員
app.post('/api/remove-group-member', authenticateToken, (req, res) => {
  const { roomId, userId } = req.body;
  
  if (!roomId || !userId) {
    return res.status(400).json({ error: '缺少必要參數' });
  }
  
  // 檢查是否是移除自己
  if (userId == req.user.id) {
    return res.status(400).json({ error: '不能移除自己' });
  }
  
  // 檢查聊天室是否存在且為群組
  connection.query(
    'SELECT type FROM chat_rooms WHERE id = ?',
    [roomId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: '聊天室不存在' });
      }
      
      if (results[0].type !== 'group') {
        return res.status(400).json({ error: '只能從群組移除成員' });
      }
      
      // 移除成員
      connection.query(
        'DELETE FROM chat_room_members WHERE room_id = ? AND user_id = ?',
        [roomId, userId],
        (err, result) => {
          if (err) {
            console.error('移除成員失敗:', err);
            return res.status(500).json({ error: '移除成員失敗' });
          }
          
          if (result.affectedRows === 0) {
            return res.status(404).json({ error: '成員不存在' });
          }
          
          // 通知用戶已被移出群組（通過Socket）
          io.to(`user_${userId}`).emit('removed-from-group', {
            roomId: roomId,
            roomName: results[0].name
          });
          
          // 通知群組其他成員有成員被移除
          io.to(roomId).emit('group-member-removed', {
            roomId: roomId,
            userId: userId,
            removedBy: req.user.id
          });
          
          res.json({ success: true });
        }
      );
    }
  );
});

// ==================== 獲取聊天室多媒體消息 ====================
app.get('/api/chat-media/:roomId', authenticateToken, (req, res) => {
  const { roomId } = req.params;
  
  // 檢查用戶是否在聊天室中
  connection.query(
    'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
    [roomId, req.user.id],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(403).json({ error: '無權限訪問' });
      }
      
      // 獲取所有多媒體消息（圖片、音頻、視頻、文件）
      connection.query(
        `SELECT 
          m.id,
          m.content,
          m.message_type,
          m.file_name,
          m.file_size,
          m.created_at,
          u.username as sender_name,
          u.avatar as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.room_id = ? 
          AND m.message_type IN ('image', 'audio', 'video', 'file')
        ORDER BY m.created_at DESC
        LIMIT 100`,
        [roomId],
        (err, results) => {
          if (err) {
            console.error('獲取多媒體消息失敗:', err);
            return res.status(500).json({ error: '獲取失敗' });
          }
          
          // 分類整理多媒體消息
          const mediaMessages = {
            images: [],
            videos: [],
            audio: [],
            files: []
          };
          
          results.forEach(msg => {
            // 構建完整的文件URL
            let fileUrl = msg.content;
            if (fileUrl && !fileUrl.startsWith('http')) {
              if (!fileUrl.startsWith('/')) {
                fileUrl = '/' + fileUrl;
              }
              fileUrl = `${BASE_URL}${fileUrl}`;
            }
            
            const mediaItem = {
              id: msg.id,
              url: fileUrl,
              type: msg.message_type,
              fileName: msg.file_name,
              fileSize: msg.file_size,
              createdAt: msg.created_at,
              sender: {
                name: msg.sender_name,
                avatar: buildAvatarUrl(msg.sender_avatar)
              }
            };
            
            if (msg.message_type === 'image') {
              mediaMessages.images.push(mediaItem);
            } else if (msg.message_type === 'video') {
              mediaMessages.videos.push(mediaItem);
            } else if (msg.message_type === 'audio') {
              mediaMessages.audio.push(mediaItem);
            } else {
              mediaMessages.files.push(mediaItem);
            }
          });
          
          res.json({ success: true, media: mediaMessages });
        }
      );
    }
  );
});

// ==================== 獲取聊天室統計信息 ====================
app.get('/api/chat-stats/:roomId', authenticateToken, (req, res) => {
  const { roomId } = req.params;
  
  connection.query(
    `SELECT 
      COUNT(DISTINCT m.id) as total_messages,
      COUNT(DISTINCT CASE WHEN m.message_type = 'image' THEN m.id END) as image_count,
      COUNT(DISTINCT CASE WHEN m.message_type = 'video' THEN m.id END) as video_count,
      COUNT(DISTINCT CASE WHEN m.message_type = 'audio' THEN m.id END) as audio_count,
      COUNT(DISTINCT CASE WHEN m.message_type = 'file' THEN m.id END) as file_count,
      COUNT(DISTINCT m.sender_id) as unique_senders,
      MIN(m.created_at) as first_message_time,
      MAX(m.created_at) as last_message_time
    FROM messages m
    WHERE m.room_id = ?`,
    [roomId],
    (err, results) => {
      if (err) {
        console.error('獲取統計失敗:', err);
        return res.status(500).json({ error: '獲取統計失敗' });
      }
      
      res.json({ success: true, stats: results[0] || {} });
    }
  );
});

// ==================== 好友相關 API ====================

// 搜索用戶
app.get('/api/search-users', authenticateToken, (req, res) => {
  const { query } = req.query;
  
  if (!query || query.trim() === '') {
    return res.json({ success: true, users: [] });
  }
  
  connection.query(
    `SELECT 
      u.id,
      u.username,
      u.email,
      u.avatar,
      u.mbti,
      u.status,
      u.last_active,
      (TIMESTAMPDIFF(MINUTE, u.last_active, NOW()) < 5) as is_online,
      (SELECT COUNT(*) FROM friendships WHERE (user1_id = u.id AND user2_id = ?) OR (user1_id = ? AND user2_id = u.id)) as is_friend,
      (SELECT COUNT(*) FROM friend_requests WHERE from_user_id = u.id AND to_user_id = ? AND status = 'pending') as is_request_pending,
      ROUND(RAND() * 10, 1) as distance
    FROM users u
    WHERE u.id != ? 
      AND (u.username LIKE ? OR u.email LIKE ?)
    LIMIT 20`,
    [req.user.id, req.user.id, req.user.id, req.user.id, `%${query}%`, `%${query}%`],
    (err, results) => {
      if (err) {
        console.error('搜索用戶失敗:', err);
        return res.status(500).json({ error: '搜尋失敗' });
      }
      
      // 處理頭像URL
      const formattedResults = results.map(user => ({
        ...user,
        avatar: buildAvatarUrl(user.avatar)
      }));
      
      res.json({ success: true, users: formattedResults });
    }
  );
});

// 獲取好友列表
app.get('/api/friends', authenticateToken, (req, res) => {
  connection.query(
    `SELECT 
      u.id,
      u.username,
      u.avatar,
      u.mbti,
      u.status,
      u.last_active,
      (TIMESTAMPDIFF(MINUTE, u.last_active, NOW()) < 5) as is_online
    FROM users u
    JOIN friendships f ON (f.user1_id = u.id OR f.user2_id = u.id)
    WHERE (f.user1_id = ? OR f.user2_id = ?) 
      AND f.status = 'accepted' 
      AND u.id != ?
    ORDER BY u.last_active DESC`,
    [req.user.id, req.user.id, req.user.id],
    (err, results) => {
      if (err) {
        console.error('獲取好友列表失敗:', err);
        return res.status(500).json({ error: '取得好友失敗' });
      }
      
      // 處理頭像URL
      const formattedResults = results.map(friend => ({
        ...friend,
        avatar: buildAvatarUrl(friend.avatar)
      }));
      
      res.json({ success: true, friends: formattedResults });
    }
  );
});

// 發送好友請求
app.post('/api/friend-request', authenticateToken, (req, res) => {
  const { toUserId } = req.body;
  
  if (!toUserId || toUserId == req.user.id) {
    return res.status(400).json({ error: '無效的請求' });
  }
  
  // 檢查是否已經是好友
  connection.query(
    'SELECT * FROM friendships WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
    [req.user.id, toUserId, toUserId, req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: '資料庫錯誤' });
      if (results.length > 0) return res.status(400).json({ error: '已經是好友' });
      
      // 檢查是否有待處理的請求
      connection.query(
        'SELECT * FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = "pending"',
        [req.user.id, toUserId],
        (err, results) => {
          if (err) return res.status(500).json({ error: '資料庫錯誤' });
          if (results.length > 0) return res.status(400).json({ error: '已經發送過好友請求' });
          
          connection.query(
            'INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, "pending")',
            [req.user.id, toUserId],
            (err) => {
              if (err) {
                console.error('發送好友請求失敗:', err);
                return res.status(500).json({ error: '發送請求失敗' });
              }
              
              // 通知接收者（通過Socket）
              io.to(`user_${toUserId}`).emit('friend-request', {
                fromUserId: req.user.id,
                fromUsername: req.user.username
              });
              
              res.json({ success: true });
            }
          );
        }
      );
    }
  );
});

// 獲取待處理的好友請求
app.get('/api/pending-friend-requests', authenticateToken, (req, res) => {
  connection.query(
    `SELECT 
      fr.*, 
      u.id as from_user_id, 
      u.username, 
      u.avatar, 
      u.mbti,
      u.status as user_status,
      (TIMESTAMPDIFF(MINUTE, u.last_active, NOW()) < 5) as is_online
    FROM friend_requests fr
    JOIN users u ON fr.from_user_id = u.id
    WHERE fr.to_user_id = ? AND fr.status = 'pending'
    ORDER BY fr.created_at DESC`,
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error('獲取待處理請求失敗:', err);
        return res.status(500).json({ error: '獲取請求失敗' });
      }
      
      // 處理頭像URL
      const formattedResults = results.map(request => ({
        ...request,
        avatar: buildAvatarUrl(request.avatar)
      }));
      
      res.json({ success: true, requests: formattedResults });
    }
  );
});

// 接受好友請求
app.post('/api/accept-friend-request', authenticateToken, (req, res) => {
  const { requestId } = req.body;
  
  connection.beginTransaction(err => {
    if (err) return res.status(500).json({ error: '交易失敗' });
    
    // 更新好友請求狀態
    connection.query(
      'UPDATE friend_requests SET status = "accepted" WHERE id = ? AND to_user_id = ?',
      [requestId, req.user.id],
      (err, result) => {
        if (err || result.affectedRows === 0) {
          return connection.rollback(() => {
            res.status(400).json({ error: '請求不存在' });
          });
        }
        
        // 獲取請求詳情
        connection.query(
          'SELECT * FROM friend_requests WHERE id = ?',
          [requestId],
          (err, results) => {
            if (err || results.length === 0) {
              return connection.rollback(() => {
                res.status(500).json({ error: '獲取請求失敗' });
              });
            }
            
            const request = results[0];
            
            // 創建好友關係
            connection.query(
              'INSERT INTO friendships (user1_id, user2_id, status) VALUES (?, ?, "accepted")',
              [request.from_user_id, request.to_user_id],
              (err) => {
                if (err) {
                  return connection.rollback(() => {
                    res.status(500).json({ error: '創建好友關係失敗' });
                  });
                }
                
                connection.commit(err => {
                  if (err) {
                    return connection.rollback(() => {
                      res.status(500).json({ error: '提交失敗' });
                    });
                  }
                  
                  // 通知發送者好友請求已被接受（通過Socket）
                  io.to(`user_${request.from_user_id}`).emit('friend-request-accepted', {
                    byUserId: req.user.id,
                    byUsername: req.user.username
                  });
                  
                  res.json({ success: true });
                });
              }
            );
          }
        );
      }
    );
  });
});

// 拒絕好友請求
app.post('/api/decline-friend-request', authenticateToken, (req, res) => {
  const { requestId } = req.body;
  
  connection.query(
    'UPDATE friend_requests SET status = "declined" WHERE id = ? AND to_user_id = ?',
    [requestId, req.user.id],
    (err, result) => {
      if (err) {
        console.error('拒絕好友請求失敗:', err);
        return res.status(500).json({ error: '拒絕請求失敗' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(400).json({ error: '請求不存在' });
      }
      
      res.json({ success: true });
    }
  );
});

// 創建私聊聊天室
app.post('/api/create-private-chat', authenticateToken, (req, res) => {
  const { userId } = req.body;
  
  if (!userId || userId == req.user.id) {
    return res.status(400).json({ error: '無效的用戶ID' });
  }
  
  // 檢查是否已經是好友
  connection.query(
    'SELECT * FROM friendships WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?) AND status = "accepted"',
    [req.user.id, userId, userId, req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: '資料庫錯誤' });
      if (results.length === 0) return res.status(400).json({ error: '請先成為好友' });
      
      // 檢查是否已經存在私聊
      connection.query(
        `SELECT cr.id 
         FROM chat_rooms cr
         JOIN chat_room_members crm1 ON cr.id = crm1.room_id
         JOIN chat_room_members crm2 ON cr.id = crm2.room_id
         WHERE cr.type = 'private'
           AND crm1.user_id = ?
           AND crm2.user_id = ?`,
        [req.user.id, userId],
        (err, results) => {
          if (err) return res.status(500).json({ error: '查詢失敗' });
          
          if (results.length > 0) {
            // 已存在聊天室
            return res.json({ success: true, roomId: results[0].id });
          }
          
          // 創建新聊天室
          connection.beginTransaction(err => {
            if (err) return res.status(500).json({ error: '交易失敗' });
            
            // 獲取對方用戶名作為聊天室名稱
            connection.query(
              'SELECT username, avatar FROM users WHERE id = ?',
              [userId],
              (err, userResults) => {
                if (err || userResults.length === 0) {
                  return connection.rollback(() => {
                    res.status(404).json({ error: '用戶不存在' });
                  });
                }
                
                const otherUserName = userResults[0].username;
                const otherUserAvatar = buildAvatarUrl(userResults[0].avatar);
                
                // 創建聊天室
                connection.query(
                  'INSERT INTO chat_rooms (type, name, avatar) VALUES ("private", ?, ?)',
                  [otherUserName, otherUserAvatar],
                  (err, result) => {
                    if (err) {
                      return connection.rollback(() => {
                        res.status(500).json({ error: '創建聊天室失敗' });
                      });
                    }
                    
                    const roomId = result.insertId;
                    
                    // 添加兩個成員
                    const queries = [
                      new Promise((resolve, reject) => {
                        connection.query('INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)', [roomId, req.user.id], (err) => {
                          if (err) reject(err);
                          else resolve();
                        });
                      }),
                      new Promise((resolve, reject) => {
                        connection.query('INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)', [roomId, userId], (err) => {
                          if (err) reject(err);
                          else resolve();
                        });
                      })
                    ];
                    
                    Promise.all(queries)
                      .then(() => {
                        connection.commit(err => {
                          if (err) {
                            return connection.rollback(() => {
                              res.status(500).json({ error: '提交失敗' });
                            });
                          }
                          
                          // 通知對方用戶新私聊已創建（通過Socket）
                          io.to(`user_${userId}`).emit('private-chat-created', {
                            roomId: roomId,
                            withUserId: req.user.id,
                            withUsername: req.user.username
                          });
                          
                          res.json({ success: true, roomId });
                        });
                      })
                      .catch(err => {
                        connection.rollback(() => {
                          res.status(500).json({ error: '添加成員失敗' });
                        });
                      });
                  }
                );
              }
            );
          });
        }
      );
    }
  );
});

// ==================== 除錯 API ====================

// 列出聊天媒體文件
app.get('/api/debug-media-files', (req, res) => {
  const files = [];
  
  // 遍歷所有子目錄
  const subDirs = ['images', 'audio', 'videos', 'files'];
  
  subDirs.forEach(subDir => {
    const dirPath = path.join(__dirname, 'uploads', 'chat_media', subDir);
    
    try {
      if (fs.existsSync(dirPath)) {
        const dirFiles = fs.readdirSync(dirPath);
        dirFiles.forEach(file => {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          files.push({
            name: file,
            path: `/uploads/chat_media/${subDir}/${file}`,
            url: `${BASE_URL}/uploads/chat_media/${subDir}/${file}`,
            size: stats.size,
            created: stats.birthtime,
            fullPath: filePath,
            subDir: subDir
          });
        });
      }
    } catch (err) {
      console.error(`讀取目錄 ${subDir} 失敗:`, err);
    }
  });
  
  res.json({
    count: files.length,
    files: files,
    baseUrl: BASE_URL,
    baseDir: __dirname
  });
});

// 檢查單個文件
app.get('/api/debug-file/:filename', (req, res) => {
  const { filename } = req.params;
  
  // 嘗試在所有子目錄中查找文件
  const subDirs = ['images', 'audio', 'videos', 'files'];
  let found = false;
  let foundPath = '';
  let foundDir = '';
  
  subDirs.forEach(subDir => {
    const filePath = path.join(__dirname, 'uploads', 'chat_media', subDir, filename);
    if (fs.existsSync(filePath)) {
      found = true;
      foundPath = filePath;
      foundDir = subDir;
    }
  });
  
  if (found) {
    res.json({
      found: true,
      filename: filename,
      path: `/uploads/chat_media/${foundDir}/${filename}`,
      url: `${BASE_URL}/uploads/chat_media/${foundDir}/${filename}`,
      fullPath: foundPath
    });
  } else {
    // 列出所有文件
    const allFiles = [];
    subDirs.forEach(subDir => {
      const dirPath = path.join(__dirname, 'uploads', 'chat_media', subDir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        allFiles.push(...files.map(f => `${subDir}/${f}`));
      }
    });
    
    res.status(404).json({ 
      error: '文件不存在',
      searchedDirs: subDirs,
      filename: filename,
      allFiles: allFiles.slice(0, 20)
    });
  }
});

// 檢查消息中的圖片路徑
app.get('/api/debug-message/:messageId', authenticateToken, (req, res) => {
  const { messageId } = req.params;
  
  connection.query(
    'SELECT * FROM messages WHERE id = ?',
    [messageId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: '消息不存在' });
      }
      
      const message = results[0];
      
      // 檢查文件是否存在
      if (message.content && message.content.includes('uploads')) {
        let filePath;
        if (message.content.startsWith('/')) {
          filePath = path.join(__dirname, message.content);
        } else {
          filePath = path.join(__dirname, '/' + message.content);
        }
        
        const fileExists = fs.existsSync(filePath);
        const fullUrl = `${BASE_URL}${message.content.startsWith('/') ? message.content : '/' + message.content}`;
        
        res.json({
          message: message,
          filePath: filePath,
          fileExists: fileExists,
          fullUrl: fullUrl
        });
      } else {
        res.json({
          message: message,
          error: '無效的文件路徑'
        });
      }
    }
  );
});

// 測試文件上傳
app.post('/api/test-upload', uploadMedia.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '沒有文件' });
  }
  
  console.log('測試上傳成功:', req.file);
  res.json({
    success: true,
    file: req.file,
    path: `/uploads/chat_media/${req.file.destination.split('chat_media/')[1]}/${req.file.filename}`,
    url: `${BASE_URL}/uploads/chat_media/${req.file.destination.split('chat_media/')[1]}/${req.file.filename}`
  });
});

// ==================== 數據庫初始化 API ====================

// 更新消息表結構
app.get('/api/update-messages-table', (req, res) => {
  connection.query(
    `ALTER TABLE messages 
     ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text',
     ADD COLUMN IF NOT EXISTS file_size INT,
     ADD COLUMN IF NOT EXISTS file_name VARCHAR(255)`,
    (err) => {
      if (err) {
        console.error('更新消息表失敗:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: '消息表更新完成' });
    }
  );
});

// 初始化數據庫表
app.get('/api/init-database', (req, res) => {
  const queries = [
    // 創建聊天室表
    `CREATE TABLE IF NOT EXISTS chat_rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      type ENUM('private', 'group', 'public') DEFAULT 'private',
      description TEXT,
      avatar VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    // 創建聊天室成員表
    `CREATE TABLE IF NOT EXISTS chat_room_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_id INT,
      user_id INT,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_member (room_id, user_id)
    )`,
    
    // 創建消息表
    `CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_id INT,
      sender_id INT,
      content TEXT,
      message_type VARCHAR(20) DEFAULT 'text',
      file_name VARCHAR(255),
      file_size INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    // 創建好友請求表
    `CREATE TABLE IF NOT EXISTS friend_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      from_user_id INT,
      to_user_id INT,
      status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    // 創建好友關係表
    `CREATE TABLE IF NOT EXISTS friendships (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user1_id INT,
      user2_id INT,
      status ENUM('accepted', 'blocked') DEFAULT 'accepted',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_friendship (user1_id, user2_id)
    )`,
    
    // 創建聊天室已讀狀態表
    `CREATE TABLE IF NOT EXISTS chat_room_reads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      room_id INT,
      message_id INT,
      read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
      UNIQUE KEY unique_read (user_id, room_id)
    )`,
    
    // 為 users 表添加缺失的字段
    `ALTER TABLE users 
     ADD COLUMN IF NOT EXISTS mbti VARCHAR(10),
     ADD COLUMN IF NOT EXISTS status VARCHAR(255),
     ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     ADD COLUMN IF NOT EXISTS avatar VARCHAR(500) DEFAULT '/uploads/avatars/default.png'`
  ];
  
  let completed = 0;
  let errors = [];
  
  queries.forEach((query, index) => {
    connection.query(query, (err, result) => {
      if (err) {
        console.error(`查詢 ${index + 1} 失敗:`, err.message);
        errors.push(`查詢 ${index + 1}: ${err.message}`);
      }
      
      completed++;
      if (completed === queries.length) {
        if (errors.length > 0) {
          res.status(500).json({ success: false, errors });
        } else {
          res.json({ success: true, message: '數據庫初始化完成' });
        }
      }
    });
  });
});

// ==================== 獎勵任務系統 API ====================

// 獲取用戶積分總數
app.get('/api/user-points', authenticateToken, (req, res) => {
  connection.query(
    `SELECT 
      IFNULL(SUM(points), 0) as total_points,
      (SELECT COUNT(*) FROM user_tasks WHERE user_id = ? AND completed_at IS NOT NULL) as completed_tasks_count
    FROM points_history 
    WHERE user_id = ?`,
    [req.user.id, req.user.id],
    (err, results) => {
      if (err) {
        console.error('獲取用戶積分失敗:', err);
        return res.status(500).json({ error: '獲取積分失敗' });
      }
      
      const calculateLevel = (points) => {
        if (points >= 5000) return '鉑金會員';
        if (points >= 2000) return '黃金會員';
        if (points >= 500) return '白銀會員';
        if (points >= 100) return '青銅會員';
        return '新手會員';
      };
      
      res.json({
        success: true,
        total_points: results[0].total_points || 0,
        completed_tasks_count: results[0].completed_tasks_count || 0,
        level: calculateLevel(results[0].total_points || 0)
      });
    }
  );
});

// 獲取任務列表
app.get('/api/tasks', authenticateToken, (req, res) => {
  connection.query(
    `SELECT 
      t.*,
      CASE 
        WHEN ut.completed_at IS NOT NULL THEN 'completed'
        WHEN ut.started_at IS NOT NULL THEN 'in_progress'
        ELSE 'not_started'
      END as user_status,
      ut.started_at,
      ut.completed_at,
      (t.points_required - IFNULL(ut.current_progress, 0)) as points_needed,
      IFNULL(ut.current_progress, 0) as current_progress
    FROM tasks t
    LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ?
    WHERE t.is_active = 1
    ORDER BY t.priority ASC, t.points_reward DESC`,
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error('獲取任務列表失敗:', err);
        return res.status(500).json({ error: '獲取任務列表失敗' });
      }
      
      // 修復：確保總是回傳正確的結構
      const dailyTasks = [];
      const achievementTasks = [];
      const specialTasks = [];
      
      // 手動分類任務
      results.forEach(task => {
        if (task.task_type === 'daily') {
          dailyTasks.push(task);
        } else if (task.task_type === 'achievement') {
          achievementTasks.push(task);
        } else if (task.task_type === 'special') {
          specialTasks.push(task);
        }
      });
      
      res.json({
        success: true,
        tasks: {
          daily: dailyTasks,
          achievement: achievementTasks,
          special: specialTasks
        }
      });
    }
  );
});

// 開始任務
app.post('/api/start-task', authenticateToken, (req, res) => {
  const { taskId } = req.body;
  
  connection.query(
    'SELECT * FROM tasks WHERE id = ? AND is_active = 1',
    [taskId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(400).json({ error: '任務不存在或已失效' });
      }
      
      const task = results[0];
      
      // 檢查是否已經開始或完成
      connection.query(
        'SELECT * FROM user_tasks WHERE user_id = ? AND task_id = ?',
        [req.user.id, taskId],
        (err, userTaskResults) => {
          if (err) return res.status(500).json({ error: '數據庫錯誤' });
          
          if (userTaskResults.length > 0) {
            const userTask = userTaskResults[0];
            if (userTask.completed_at) {
              return res.status(400).json({ error: '任務已完成' });
            }
            return res.status(400).json({ error: '任務已開始' });
          }
          
          // 開始任務
          connection.query(
            'INSERT INTO user_tasks (user_id, task_id, started_at, current_progress) VALUES (?, ?, NOW(), 0)',
            [req.user.id, taskId],
            (err) => {
              if (err) {
                console.error('開始任務失敗:', err);
                return res.status(500).json({ error: '開始任務失敗' });
              }
              
              res.json({ 
                success: true, 
                message: '任務已開始',
                task: {
                  ...task,
                  user_status: 'in_progress',
                  current_progress: 0
                }
              });
            }
          );
        }
      );
    }
  );
});

// 提交任務進度
app.post('/api/submit-task-progress', authenticateToken, (req, res) => {
  const { taskId, progress } = req.body;
  
  connection.beginTransaction(err => {
    if (err) return res.status(500).json({ error: '交易失敗' });
    
    // 1. 檢查任務是否存在且進行中
    connection.query(
      `SELECT ut.*, t.points_required, t.points_reward 
       FROM user_tasks ut
       JOIN tasks t ON ut.task_id = t.id
       WHERE ut.user_id = ? AND ut.task_id = ? AND t.is_active = 1`,
      [req.user.id, taskId],
      (err, results) => {
        if (err || results.length === 0) {
          return connection.rollback(() => {
            res.status(400).json({ error: '任務不存在或未開始' });
          });
        }
        
        const userTask = results[0];
        const newProgress = Math.min(progress, userTask.points_required);
        
        // 2. 更新進度
        connection.query(
          'UPDATE user_tasks SET current_progress = ? WHERE user_id = ? AND task_id = ?',
          [newProgress, req.user.id, taskId],
          (err) => {
            if (err) {
              return connection.rollback(() => {
                res.status(500).json({ error: '更新進度失敗' });
              });
            }
            
            // 3. 如果進度達到要求，完成任務
            if (newProgress >= userTask.points_required && !userTask.completed_at) {
              connection.query(
                'UPDATE user_tasks SET completed_at = NOW() WHERE user_id = ? AND task_id = ?',
                [req.user.id, taskId],
                (err) => {
                  if (err) {
                    return connection.rollback(() => {
                      res.status(500).json({ error: '完成任務失敗' });
                    });
                  }
                  
                  // 4. 添加積分記錄
                  connection.query(
                    'INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, "task_reward", ?)',
                    [req.user.id, userTask.points_reward, `完成任務: ${userTask.task_id}`],
                    (err) => {
                      if (err) {
                        return connection.rollback(() => {
                          res.status(500).json({ error: '發放獎勵失敗' });
                        });
                      }
                      
                      connection.commit(err => {
                        if (err) {
                          return connection.rollback(() => {
                            res.status(500).json({ error: '提交失敗' });
                          });
                        }
                        
                        // 5. 獲取更新後的積分總數
                        connection.query(
                          'SELECT IFNULL(SUM(points), 0) as total_points FROM points_history WHERE user_id = ?',
                          [req.user.id],
                          (err, pointResults) => {
                            if (err) {
                              return res.json({ 
                                success: true, 
                                message: '任務完成！',
                                points_earned: userTask.points_reward,
                                task_completed: true
                              });
                            }
                            
                            const calculateLevel = (points) => {
                              if (points >= 5000) return '鉑金會員';
                              if (points >= 2000) return '黃金會員';
                              if (points >= 500) return '白銀會員';
                              if (points >= 100) return '青銅會員';
                              return '新手會員';
                            };
                            
                            res.json({ 
                              success: true, 
                              message: '任務完成！',
                              points_earned: userTask.points_reward,
                              total_points: pointResults[0].total_points,
                              task_completed: true,
                              level: calculateLevel(pointResults[0].total_points)
                            });
                          }
                        );
                      });
                    }
                  );
                }
              );
            } else {
              connection.commit(err => {
                if (err) {
                  return connection.rollback(() => {
                    res.status(500).json({ error: '提交失敗' });
                  });
                }
                
                res.json({ 
                  success: true, 
                  message: '進度已更新',
                  current_progress: newProgress,
                  points_needed: userTask.points_required - newProgress,
                  task_completed: false
                });
              });
            }
          }
        );
      }
    );
  });
});

// 獲取積分歷史記錄
app.get('/api/points-history', authenticateToken, (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  
  connection.query(
    `SELECT 
      ph.*,
      DATE_FORMAT(ph.created_at, '%Y-%m-%d %H:%i') as formatted_time,
      CASE 
        WHEN ph.points > 0 THEN 'earn'
        ELSE 'spend'
      END as action_type
    FROM points_history ph
    WHERE ph.user_id = ?
    ORDER BY ph.created_at DESC
    LIMIT ? OFFSET ?`,
    [req.user.id, parseInt(limit), parseInt(offset)],
    (err, results) => {
      if (err) {
        console.error('獲取積分歷史失敗:', err);
        return res.status(500).json({ error: '獲取歷史記錄失敗' });
      }
      
      // 獲取總數
      connection.query(
        'SELECT COUNT(*) as total FROM points_history WHERE user_id = ?',
        [req.user.id],
        (err, countResults) => {
          if (err) {
            return res.json({ success: true, history: results });
          }
          
          res.json({
            success: true,
            history: results,
            total: countResults[0].total,
            has_more: results.length === parseInt(limit)
          });
        }
      );
    }
  );
});

// 獲取商店商品列表
app.get('/api/shop-items', authenticateToken, (req, res) => {
  connection.query(
    `SELECT 
      si.*,
      (si.stock - (SELECT COUNT(*) FROM user_redemptions WHERE item_id = si.id AND status = 'redeemed')) as available_stock,
      CASE 
        WHEN (SELECT COUNT(*) FROM user_redemptions WHERE user_id = ? AND item_id = si.id AND status = 'redeemed') > 0 
        THEN true 
        ELSE false 
      END as is_redeemed
    FROM shop_items si
    WHERE si.is_active = 1
    ORDER BY si.points_required ASC, si.created_at DESC`,
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error('獲取商店商品失敗:', err);
        return res.status(500).json({ error: '獲取商品列表失敗' });
      }
      
      // 修復：確保總是回傳陣列，即使為空
      if (!results) {
        results = [];
      }
      
      // 獲取用戶當前積分
      connection.query(
        'SELECT IFNULL(SUM(points), 0) as total_points FROM points_history WHERE user_id = ?',
        [req.user.id],
        (err, pointResults) => {
          if (err) {
            console.error('獲取用戶積分失敗:', err);
            return res.json({ 
              success: true, 
              items: results, 
              user_points: 0 
            });
          }
          
          res.json({
            success: true,
            items: results,  // 確保這是陣列
            user_points: pointResults[0].total_points || 0
          });
        }
      );
    }
  );
});

// 兌換商品
app.post('/api/redeem-item', authenticateToken, (req, res) => {
  const { itemId } = req.body;
  
  connection.beginTransaction(err => {
    if (err) return res.status(500).json({ error: '交易失敗' });
    
    // 1. 檢查商品是否存在且有庫存
    connection.query(
      `SELECT * FROM shop_items 
       WHERE id = ? AND is_active = 1 
         AND stock > (SELECT COUNT(*) FROM user_redemptions WHERE item_id = ? AND status = 'redeemed')`,
      [itemId, itemId],
      (err, results) => {
        if (err || results.length === 0) {
          return connection.rollback(() => {
            res.status(400).json({ error: '商品不存在或已售罄' });
          });
        }
        
        const item = results[0];
        
        // 2. 檢查用戶是否已兌換過（如果限制每人一次）
        if (item.limit_per_user > 0) {
          connection.query(
            `SELECT COUNT(*) as redeemed_count 
             FROM user_redemptions 
             WHERE user_id = ? AND item_id = ? AND status = 'redeemed'`,
            [req.user.id, itemId],
            (err, redeemResults) => {
              if (err) {
                return connection.rollback(() => {
                  res.status(500).json({ error: '數據庫錯誤' });
                });
              }
              
              if (redeemResults[0].redeemed_count >= item.limit_per_user) {
                return connection.rollback(() => {
                  res.status(400).json({ error: '已達到兌換上限' });
                });
              }
              
              checkUserPoints(item);
            }
          );
        } else {
          checkUserPoints(item);
        }
        
        function checkUserPoints(item) {
          // 3. 檢查用戶積分是否足夠
          connection.query(
            'SELECT IFNULL(SUM(points), 0) as total_points FROM points_history WHERE user_id = ?',
            [req.user.id],
            (err, pointResults) => {
              if (err) {
                return connection.rollback(() => {
                  res.status(500).json({ error: '數據庫錯誤' });
                });
              }
              
              const userPoints = pointResults[0].total_points || 0;
              
              if (userPoints < item.points_required) {
                return connection.rollback(() => {
                  res.status(400).json({ error: '積分不足' });
                });
              }
              
              // 4. 創建兌換記錄
              connection.query(
                'INSERT INTO user_redemptions (user_id, item_id, status) VALUES (?, ?, "pending")',
                [req.user.id, itemId],
                (err, result) => {
                  if (err) {
                    return connection.rollback(() => {
                      res.status(500).json({ error: '兌換失敗' });
                    });
                  }
                  
                  // 5. 扣除積分
                  connection.query(
                    'INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, "item_redeem", ?)',
                    [req.user.id, -item.points_required, `兌換商品: ${item.name}`],
                    (err) => {
                      if (err) {
                        return connection.rollback(() => {
                          res.status(500).json({ error: '扣除積分失敗' });
                        });
                      }
                      
                      // 6. 更新兌換記錄狀態
                      connection.query(
                        'UPDATE user_redemptions SET status = "redeemed", redeemed_at = NOW() WHERE id = ?',
                        [result.insertId],
                        (err) => {
                          if (err) {
                            return connection.rollback(() => {
                              res.status(500).json({ error: '更新狀態失敗' });
                            });
                          }
                          
                          connection.commit(err => {
                            if (err) {
                              return connection.rollback(() => {
                                res.status(500).json({ error: '提交失敗' });
                              });
                            }
                            
                            // 7. 獲取更新後的積分
                            connection.query(
                              'SELECT IFNULL(SUM(points), 0) as total_points FROM points_history WHERE user_id = ?',
                              [req.user.id],
                              (err, finalPointResults) => {
                                if (err) {
                                  return res.json({ 
                                    success: true, 
                                    message: '兌換成功！',
                                    redemption_id: result.insertId
                                  });
                                }
                                
                                const calculateLevel = (points) => {
                                  if (points >= 5000) return '鉑金會員';
                                  if (points >= 2000) return '黃金會員';
                                  if (points >= 500) return '白銀會員';
                                  if (points >= 100) return '青銅會員';
                                  return '新手會員';
                                };
                                
                                res.json({ 
                                  success: true, 
                                  message: '兌換成功！',
                                  redemption_id: result.insertId,
                                  remaining_points: finalPointResults[0].total_points,
                                  level: calculateLevel(finalPointResults[0].total_points)
                                });
                              }
                            );
                          });
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      }
    );
  });
});

// 獲取用戶兌換記錄
app.get('/api/user-redemptions', authenticateToken, (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  
  connection.query(
    `SELECT 
      ur.*,
      si.name as item_name,
      si.description as item_description,
      si.image_url as item_image,
      si.points_required,
      DATE_FORMAT(ur.redeemed_at, '%Y-%m-%d %H:%i') as formatted_time,
      CASE 
        WHEN ur.status = 'redeemed' THEN '已完成'
        WHEN ur.status = 'pending' THEN '處理中'
        WHEN ur.status = 'shipped' THEN '已發貨'
        ELSE ur.status
      END as status_text
    FROM user_redemptions ur
    JOIN shop_items si ON ur.item_id = si.id
    WHERE ur.user_id = ?
    ORDER BY ur.redeemed_at DESC
    LIMIT ? OFFSET ?`,
    [req.user.id, parseInt(limit), parseInt(offset)],
    (err, results) => {
      if (err) {
        console.error('獲取兌換記錄失敗:', err);
        return res.status(500).json({ error: '獲取兌換記錄失敗' });
      }
      
      res.json({
        success: true,
        redemptions: results,
        total: results.length,
        has_more: results.length === parseInt(limit)
      });
    }
  );
});

// 每日簽到 API - 連續 N 天 = + (N × 10) 分，中斷後重置為 1 天
app.post('/api/daily-checkin', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. 檢查今天是否已經簽到過
    const [todayCheckin] = await connection.promise().query(
      `SELECT id 
       FROM daily_checkins 
       WHERE user_id = ? 
       AND DATE(checkin_date) = CURDATE()`,
      [userId]
    );

    if (todayCheckin.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: '今日已簽到' 
      });
    }

    // 2. 查詢昨天的簽到記錄，決定是否延續 streak
    const [yesterdayCheckin] = await connection.promise().query(
      `SELECT streak 
       FROM daily_checkins 
       WHERE user_id = ? 
       AND DATE(checkin_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
       ORDER BY checkin_date DESC 
       LIMIT 1`,
      [userId]
    );

    let streak = 1;  // 預設今天是連續第 1 天

    if (yesterdayCheckin.length > 0) {
      const yesterdayStreak = Number(yesterdayCheckin[0].streak || 1);
      streak = yesterdayStreak + 1;
    }

    // 3. 根據連續天數計算積分：N 天 = N × 10 分
    const points = streak * 10;

    // 4. 插入今天的簽到記錄
    await connection.promise().query(
      `INSERT INTO daily_checkins 
       (user_id, checkin_date, points_earned, streak) 
       VALUES (?, NOW(), ?, ?)`,
      [userId, points, streak]
    );

    // 5. 更新用戶總積分
    await connection.promise().query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [points, userId]
    );

    // 6. 記錄到積分歷史
    await connection.promise().query(
      `INSERT INTO points_history 
       (user_id, points, type, description) 
       VALUES (?, ?, 'daily_checkin', ?)`,
      [userId, points, `每日簽到 (連續 ${streak} 天，獲得 ${points} 積分)`]
    );

    // 7. 回傳結果給前端
    res.json({
      success: true,
      message: `簽到成功！獲得 ${points} 積分`,
      streak: streak,
      points_earned: points
    });

  } catch (err) {
    console.error('每日簽到失敗 - 詳細錯誤：', {
      message: err.message,
      code: err.code,
      sql: err.sql || 'N/A',
      sqlState: err.sqlState || 'N/A'
    });

    res.status(500).json({ 
      success: false, 
      error: '伺服器錯誤，請稍後再試' 
    });
  }
});

// 檢查今日簽到狀態
app.get('/api/checkin-status', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  connection.query(
    `SELECT 
      EXISTS(SELECT 1 FROM daily_checkins WHERE user_id = ? AND DATE(checkin_date) = ?) as checked_in_today,
      (SELECT COUNT(*) FROM daily_checkins WHERE user_id = ? AND checkin_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)) as consecutive_week_days,
      (SELECT MAX(checkin_date) FROM daily_checkins WHERE user_id = ?) as last_checkin_date
    FROM dual`,
    [req.user.id, today, req.user.id, req.user.id],
    (err, results) => {
      if (err) {
        console.error('檢查簽到狀態失敗:', err);
        return res.status(500).json({ error: '檢查簽到狀態失敗' });
      }
      
      res.json({
        success: true,
        checked_in_today: Boolean(results[0].checked_in_today),
        consecutive_week_days: results[0].consecutive_week_days || 0,
        last_checkin_date: results[0].last_checkin_date
      });
    }
  );
});

// 初始化獎勵系統數據庫表
app.get('/api/init-rewards-db', (req, res) => {
  const queries = [
    // 任務表
    `CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      task_type ENUM('daily', 'achievement', 'special') DEFAULT 'daily',
      points_required INT DEFAULT 1,
      points_reward INT DEFAULT 10,
      priority INT DEFAULT 5,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    // 用戶任務進度表
    `CREATE TABLE IF NOT EXISTS user_tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      task_id INT NOT NULL,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      current_progress INT DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_task (user_id, task_id)
    )`,
    
    // 積分歷史表
    `CREATE TABLE IF NOT EXISTS points_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      points INT NOT NULL,
      type ENUM('task_reward', 'daily_checkin', 'item_redeem', 'system_bonus', 'referral') DEFAULT 'task_reward',
      description VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    // 商店商品表
    `CREATE TABLE IF NOT EXISTS shop_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100) DEFAULT 'general',
      points_required INT NOT NULL,
      stock INT DEFAULT 1,
      limit_per_user INT DEFAULT 1,
      image_url VARCHAR(500),
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    // 用戶兌換記錄表
    `CREATE TABLE IF NOT EXISTS user_redemptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      item_id INT NOT NULL,
      status ENUM('pending', 'redeemed', 'shipped', 'cancelled') DEFAULT 'pending',
      redeemed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE
    )`,
    
    // 每日簽到表
    `CREATE TABLE IF NOT EXISTS daily_checkins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      checkin_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      points_earned INT DEFAULT 10,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_daily_checkin (user_id, DATE(checkin_date))
    )`
  ];
  
  let completed = 0;
  let errors = [];
  
  queries.forEach((query, index) => {
    connection.query(query, (err, result) => {
      if (err) {
        console.error(`初始化表 ${index + 1} 失敗:`, err.message);
        errors.push(`表 ${index + 1}: ${err.message}`);
      }
      
      completed++;
      if (completed === queries.length) {
        if (errors.length > 0) {
          res.status(500).json({ success: false, errors });
        } else {
          // 插入示例數據
          insertSampleData()
            .then(() => {
              res.json({ success: true, message: '獎勵系統數據庫初始化完成，示例數據已添加' });
            })
            .catch(sampleErr => {
              res.json({ success: true, message: '獎勵系統數據庫初始化完成，但示例數據添加失敗: ' + sampleErr.message });
            });
        }
      }
    });
  });
});

// 插入示例數據
const insertSampleData = async () => {
  return new Promise((resolve, reject) => {
    // 插入示例任務
    const sampleTasks = [
      ['完成MBTI測試', '進行完整的MBTI性格測試，了解自己的性格類型', 'achievement', 1, 100, 1],
      ['上傳頭像', '設置個人頭像，讓其他用戶更容易認識你', 'daily', 1, 20, 2],
      ['完善個人資料', '填寫完整的個人信息，包括MBTI和狀態', 'daily', 1, 30, 3],
      ['發送第一條消息', '在聊天室中發送第一條消息', 'achievement', 1, 50, 4],
      ['添加第一位好友', '成功添加一位好友', 'achievement', 1, 80, 5],
      ['活躍用戶', '連續7天登錄應用', 'special', 7, 200, 6],
      ['參與群聊', '在群組聊天中發送5條消息', 'daily', 5, 40, 7],
      ['探索功能', '使用所有主要功能（匹配、聊天、個人資料）', 'special', 3, 150, 8]
    ];
    
    sampleTasks.forEach((task, index) => {
      connection.query(
        `INSERT IGNORE INTO tasks (title, description, task_type, points_required, points_reward, priority) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        task,
        (err) => {
          if (err) console.error('插入任務失敗:', err);
        }
      );
    });
    
    // 插入示例商品
    const sampleItems = [
      ['電影優惠券', '可用於指定影院的電影票優惠', 'coupon', 500, 100, '/uploads/shop/movie_ticket.jpg'],
      ['咖啡券', '星巴克或類似咖啡店優惠券', 'coupon', 300, 200, '/uploads/shop/coffee_coupon.jpg'],
      ['個性化頭像框', '特殊頭像框裝飾', 'virtual', 200, 1000, '/uploads/shop/avatar_frame.png'],
      ['聊天氣泡皮膚', '個性化聊天氣泡樣式', 'virtual', 150, 500, '/uploads/shop/chat_bubble.png'],
      ['7天VIP體驗', 'VIP特權體驗（無廣告、優先匹配）', 'virtual', 1000, 50, '/uploads/shop/vip_badge.png'],
      ['實體禮品卡', '100元購物禮品卡（需填寫郵寄地址）', 'physical', 5000, 10, '/uploads/shop/gift_card.jpg']
    ];
    
    sampleItems.forEach((item, index) => {
      connection.query(
        `INSERT IGNORE INTO shop_items (name, description, category, points_required, stock, image_url) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        item,
        (err) => {
          if (err) console.error('插入商品失敗:', err);
        }
      );
    });
    
    setTimeout(resolve, 1000);
  });
};

// 給新用戶初始積分
app.post('/api/give-welcome-points', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  connection.query(
    'SELECT COUNT(*) as count FROM points_history WHERE user_id = ? AND type = "system_bonus" AND description LIKE "歡迎積分%"',
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: '數據庫錯誤' });
      
      if (results[0].count > 0) {
        return res.status(400).json({ error: '已經領取過歡迎積分' });
      }
      
      connection.query(
        'INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, "system_bonus", "歡迎積分")',
        [userId, 100],
        (err) => {
          if (err) {
            console.error('發放歡迎積分失敗:', err);
            return res.status(500).json({ error: '發放積分失敗' });
          }
          
          res.json({ 
            success: true, 
            message: '成功獲得100歡迎積分！',
            points_earned: 100 
          });
        }
      );
    }
  );
});

// ==================== 討論區相關 API ====================

// 發佈新帖子（支援文字或媒體）
app.post('/api/posts', authenticateToken, (req, res, next) => {
  uploadPostMedia(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, (req, res) => {
  const { content } = req.body;
  const userId = req.user.id;

  if (!content && (!req.files || req.files.length === 0)) {
    return res.status(400).json({ error: '帖子必须有内容或媒体' });
  }

  const mediaUrls = [];
  const mediaTypes = [];

  if (req.files && req.files.length > 0) {
    req.files.forEach((file) => {
      const type = file.mimetype.split('/')[0];
      const subDir = type === 'video' ? 'videos' : 'images';
      const mediaUrl = `/uploads/post_media/${subDir}/${file.filename}`;
      mediaUrls.push(mediaUrl);
      mediaTypes.push(type === 'video' ? 'video' : 'image');
    });
  }

  connection.query(
    'INSERT INTO posts (user_id, content, media_urls, media_types) VALUES (?, ?, ?, ?)',
    [userId, content || '', JSON.stringify(mediaUrls), JSON.stringify(mediaTypes)],
    (err, result) => {
      if (err) {
        // 如果插入失败，删除已上传文件
        if (req.files) {
          req.files.forEach((file) => fs.unlink(file.path, () => {}));
        }
        console.error('插入失败:', err);
        return res.status(500).json({ error: '发布失败' });
      }
      res.json({ success: true, postId: result.insertId });
    }
  );
});

// 獲取帖子列表（時間線，按時間倒序）
// 獲取帖子列表（時間線，按時間倒序）
app.get('/api/posts', authenticateToken, (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  connection.query(
    `SELECT 
      p.id, p.content, p.media_urls, p.media_types, p.created_at,
      u.id as user_id, u.username, u.avatar,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked_by_me
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?`,
    [req.user.id, limit, offset],
    (err, results) => {
      if (err) {
        console.error('獲取帖子列表失敗:', err);
        return res.status(500).json({ error: '獲取失敗' });
      }

      // 解析 JSON 為陣列
      const formattedPosts = results.map(post => ({
        ...post,
        media_urls: post.media_urls ? JSON.parse(post.media_urls) : [],
        media_types: post.media_types ? JSON.parse(post.media_types) : []
      }));

      res.json({ success: true, posts: formattedPosts });
    }
  );
});

// 獲取單一帖子詳情
app.get('/api/posts/:postId', authenticateToken, (req, res) => {
  const { postId } = req.params;

  connection.query(
    `SELECT 
      p.id, p.content, p.media_urls, p.media_types, p.created_at,
      u.id as user_id, u.username, u.avatar,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked_by_me
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?`,
    [req.user.id, postId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: '帖子不存在' });
      }

      // 解析 JSON 為陣列
      const post = results[0];
      post.media_urls = post.media_urls ? JSON.parse(post.media_urls) : [];
      post.media_types = post.media_types ? JSON.parse(post.media_types) : [];

      res.json({ success: true, post });
    }
  );
});

// NEW: Get single post by ID
app.get('/api/posts/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  connection.query(
    `SELECT 
      p.id, p.content, p.media_url, p.media_type, p.created_at,
      u.id as user_id, u.username, u.avatar,
      COUNT(pl.id) as like_count,
      IF(pl2.user_id IS NOT NULL, 1, 0) as is_liked_by_me,
      COUNT(pc.id) as comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN post_likes pl ON p.id = pl.post_id
    LEFT JOIN post_likes pl2 ON p.id = pl2.post_id AND pl2.user_id = ?
    LEFT JOIN post_comments pc ON p.id = pc.post_id
    WHERE p.id = ?
    GROUP BY p.id`,
    [userId, id],
    (err, results) => {
      if (err) {
        console.error('獲取貼文失敗:', err);
        return res.status(500).json({ error: '獲取失敗' });
      }
      if (results.length === 0) return res.status(404).json({ error: '貼文不存在' });
      res.json({ success: true, post: results[0] });
    }
  );
});

// 點讚/取消點讚
app.post('/api/posts/:postId/like', authenticateToken, (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  // 檢查是否已點讚
  connection.query(
    'SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?',
    [postId, userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: '資料庫錯誤' });

      if (results.length > 0) {
        // 取消點讚
        connection.query(
          'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
          [postId, userId],
          (err) => {
            if (err) return res.status(500).json({ error: '取消點讚失敗' });
            res.json({ success: true, liked: false });
          }
        );
      } else {
        // 添加點讚
        connection.query(
          'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
          [postId, userId],
          (err) => {
            if (err) return res.status(500).json({ error: '點讚失敗' });
            res.json({ success: true, liked: true });
          }
        );
      }
    }
  );
});

// 添加評論
app.post('/api/posts/:postId/comment', authenticateToken, (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: '評論內容不能為空' });
  }

  connection.query(
    'INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)',
    [postId, userId, content.trim()],
    (err, result) => {
      if (err) {
        console.error('添加評論失敗:', err);
        return res.status(500).json({ error: '添加失敗' });
      }
      res.json({ success: true, commentId: result.insertId });
    }
  );
});

// 獲取評論列表
app.get('/api/posts/:postId/comments', authenticateToken, (req, res) => {
  const { postId } = req.params;
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  connection.query(
    `SELECT 
      c.id, c.content, c.created_at,
      u.id as user_id, u.username, u.avatar
    FROM post_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?`,
    [postId, limit, offset],
    (err, results) => {
      if (err) {
        console.error('獲取評論失敗:', err);
        return res.status(500).json({ error: '獲取失敗' });
      }
      res.json({ success: true, comments: results });
    }
  );
});

// 刪除評論
app.delete('/api/posts/:postId/comments/:commentId', authenticateToken, async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.user.id;

  try {
    // 檢查評論是否存在並屬於當前用戶
    const [comment] = await connection.promise().query(
      'SELECT * FROM post_comments WHERE id = ? AND post_id = ? AND user_id = ?',
      [commentId, postId, userId]
    );

    if (comment.length === 0) {
      return res.status(404).json({ error: '評論不存在或無權限刪除' });
    }

    // 刪除評論
    await connection.promise().query('DELETE FROM post_comments WHERE id = ?', [commentId]);

    res.json({ success: true, message: '評論已刪除' });
  } catch (err) {
    console.error('刪除評論失敗:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// ==================== 刪除貼文 API ====================
app.delete('/api/posts/:id', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;

  try {
    // 检查帖子是否存在并属于当前用户
    const [post] = await connection.promise().query(
      'SELECT * FROM posts WHERE id = ? AND user_id = ?',
      [postId, userId]
    );

    if (post.length === 0) {
      return res.status(404).json({ error: '帖子不存在或无权限删除' });
    }

    // 删除帖子（评论和赞会级联删除，如果有外键）
    await connection.promise().query('DELETE FROM posts WHERE id = ?', [postId]);

    // 删除相关媒体文件（如果有多个）
    if (post[0].media_urls) {
      const mediaUrls = JSON.parse(post[0].media_urls);
      mediaUrls.forEach((url) => {
        const mediaPath = path.join(__dirname, url);
        if (fs.existsSync(mediaPath)) {
          fs.unlinkSync(mediaPath);
        }
      });
    }

    res.json({ success: true, message: '帖子已删除' });
  } catch (err) {
    console.error('删除帖子失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新貼文
app.put('/api/posts/:id', authenticateToken, uploadPostMedia, async (req, res) => {
  const postId = req.params.id;
  const { content, removeMedia } = req.body; // removeMedia 是要刪除的舊媒體 URL 陣列 (JSON string)
  const userId = req.user.id;
  const newMediaFiles = req.files || [];

  try {
    // 檢查貼文是否存在並屬於當前用戶
    const [post] = await connection.promise().query(
      'SELECT * FROM posts WHERE id = ? AND user_id = ?',
      [postId, userId]
    );

    if (post.length === 0) {
      return res.status(404).json({ error: '貼文不存在或無權限編輯' });
    }

    let mediaUrls = post[0].media_urls ? JSON.parse(post[0].media_urls) : [];

    // 處理刪除舊媒體
    if (removeMedia) {
      const removeList = JSON.parse(removeMedia);
      removeList.forEach((url) => {
        const mediaPath = path.join(__dirname, url);
        if (fs.existsSync(mediaPath)) {
          fs.unlinkSync(mediaPath);
        }
      });
      mediaUrls = mediaUrls.filter(url => !removeList.includes(url));
    }

    // 處理新媒體
    const newMediaUrls = newMediaFiles.map(file => {
      const type = file.mimetype.split('/')[0];
      const subDir = type === 'video' ? 'videos' : 'images';
      return `/uploads/post_media/${subDir}/${file.filename}`;
    });

    mediaUrls = [...mediaUrls, ...newMediaUrls];

    // 更新資料庫
    await connection.promise().query(
      'UPDATE posts SET content = ?, media_urls = ? WHERE id = ?',
      [content.trim() || post[0].content, JSON.stringify(mediaUrls), postId]
    );

    res.json({ success: true, message: '貼文已更新' });
  } catch (err) {
    console.error('更新貼文失敗:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 獲取朋友圈貼文（只顯示朋友的貼文，不包括自己）
app.get('/api/friend-posts', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 15;
  const offset = parseInt(req.query.offset) || 0;

  try {
    // 步驟1: 找出所有朋友的 user ID（雙向關係，不包含自己）
    const [friendRows] = await connection.promise().query(`
      SELECT user2_id AS friend_id
      FROM friendships
      WHERE user1_id = ? AND status = 'accepted'
      UNION
      SELECT user1_id AS friend_id
      FROM friendships
      WHERE user2_id = ? AND status = 'accepted'
    `, [userId, userId]);

    if (friendRows.length === 0) {
      return res.json({ success: true, posts: [] });
    }

    const friendIds = friendRows.map(row => row.friend_id);

    // 步驟2: 動態生成 IN clause 的 ? 占位符
    const placeholders = friendIds.map(() => '?').join(', ');
    const sql = `
      SELECT
        p.*,
        u.username,
        u.avatar,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) AS is_liked_by_me,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id) AS comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id IN (${placeholders})
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    // 參數順序：先 is_liked_by_me 的 userId，再 friendIds，再 limit/offset
    const params = [userId, ...friendIds, limit, offset];

    const [posts] = await connection.promise().query(sql, params);

    // 處理媒體與頭像（保持相對路徑，讓前端統一加上 baseURL）
    posts.forEach(post => {
      if (post.media_urls) {
        try {
          post.media_urls = JSON.parse(post.media_urls);
        } catch (e) {
          post.media_urls = [];
        }
      }
      // avatar 保持相對路徑
      if (post.avatar && post.avatar.startsWith('http')) {
        // 如果後端不小心加了 http，可選擇這裡移除，但建議統一由前端處理
      }
    });

    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: '伺服器錯誤'
    });
  }
});

// ==================== 健康檢查 API ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'LockMATCH API',
    version: '1.0.0'
  });
});

// ==================== 錯誤處理 ====================
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超過限制' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  console.error('伺服器錯誤:', err);
  res.status(500).json({ error: '伺服器內部錯誤' });
});

// ==================== 初始化獎勵系統數據庫表 ====================
app.get('/api/init-rewards-tables', (req, res) => {
  const queries = [
    // 任務表
    `CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      task_type ENUM('daily', 'achievement', 'special') DEFAULT 'daily',
      points_required INT DEFAULT 1,
      points_reward INT DEFAULT 10,
      priority INT DEFAULT 5,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    // 用戶任務進度表
    `CREATE TABLE IF NOT EXISTS user_tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      task_id INT NOT NULL,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      current_progress INT DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_task (user_id, task_id)
    )`,
    
    // 積分歷史表
    `CREATE TABLE IF NOT EXISTS points_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      points INT NOT NULL,
      type ENUM('task_reward', 'daily_checkin', 'item_redeem', 'system_bonus', 'referral') DEFAULT 'task_reward',
      description VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    // 商店商品表
    `CREATE TABLE IF NOT EXISTS shop_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100) DEFAULT 'general',
      points_required INT NOT NULL,
      stock INT DEFAULT 1,
      limit_per_user INT DEFAULT 1,
      image_url VARCHAR(500),
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    // 用戶兌換記錄表
    `CREATE TABLE IF NOT EXISTS user_redemptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      item_id INT NOT NULL,
      status ENUM('pending', 'redeemed', 'shipped', 'cancelled') DEFAULT 'pending',
      redeemed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE
    )`,
    
    // 每日簽到表
    `CREATE TABLE IF NOT EXISTS daily_checkins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      checkin_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      points_earned INT DEFAULT 10,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_daily_checkin (user_id, DATE(checkin_date))
    )`
  ];
  
  let completed = 0;
  let errors = [];
  
  queries.forEach((query, index) => {
    connection.query(query, (err, result) => {
      if (err) {
        console.error(`初始化表 ${index + 1} 失敗:`, err.message);
        errors.push(`表 ${index + 1}: ${err.message}`);
      } else {
        console.log(`表 ${index + 1} 初始化成功`);
      }
      
      completed++;
      if (completed === queries.length) {
        if (errors.length > 0) {
          res.status(500).json({ success: false, errors });
        } else {
          // 插入示例數據
          insertSampleData()
            .then(() => {
              res.json({ success: true, message: '獎勵系統數據庫初始化完成，示例數據已添加' });
            })
            .catch(sampleErr => {
              console.error('插入示例數據失敗:', sampleErr);
              res.json({ success: true, message: '獎勵系統數據庫初始化完成，但示例數據添加失敗' });
            });
        }
      }
    });
  });
});

// ==================== 啟動伺服器 ====================
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`後端 API 運行中 → http://localhost:${PORT}`);
  console.log(`Socket.io 運行中 → ws://localhost:${PORT}`);
  console.log(`Android 模擬器用：http://10.0.2.2:${PORT}`);
  console.log(`真機測試用：${BASE_URL}`);
  console.log(`健康檢查：${BASE_URL}/api/health`);
  
  // 自動初始化數據庫
  connection.query('SELECT 1', (err) => {
    if (!err) {
      console.log('數據庫連線正常，可以開始使用API');
    }
  });
});