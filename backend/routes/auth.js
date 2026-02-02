// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = (connection, authMiddleware, buildAvatarUrl, JWT_SECRET) => {  // 傳入依賴

  // 註冊 API
  router.post('/register', async (req, res) => {
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

  // 登入 API
  router.post('/login', (req, res) => {
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

  // 驗證 token & 取得目前使用者資訊
  router.get('/me', authMiddleware(JWT_SECRET), (req, res) => {
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

  return router;
};