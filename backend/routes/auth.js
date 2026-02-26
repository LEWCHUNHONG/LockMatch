// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = (connection, authMiddleware, buildAvatarUrl, JWT_SECRET) => {

  // 註冊 API
  router.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ error: '請填寫完整資訊' });
    }

    connection.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email],
      async (err, results) => {
        if (err) return res.status(500).json({ error: '資料庫錯誤' });
        if (results.length > 0) return res.status(400).json({ error: '帳號或信箱已存在' });

        const hashedPassword = await bcrypt.hash(password, 10);

        connection.query(
          'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
          [username, hashedPassword, email],
          (err, result) => {
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
          }
        );
      }
    );
  });

  // 登入 API
  router.post('/login', (req, res) => {
    const { username, password } = req.body;

    connection.query(
      'SELECT * FROM users WHERE username = ?',
      [username],
      async (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: '伺服器錯誤' });
        }

        if (results.length === 0) {
          return res.status(400).json({ error: '帳號或密碼錯誤' });
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
          return res.status(400).json({ error: '帳號或密碼錯誤' });
        }

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
      }
    );
  });

  // 獲取目前使用者資訊
  router.get('/me', authMiddleware(JWT_SECRET), (req, res) => {
    connection.query(
      `SELECT id, username, email, avatar, mbti, points, status, last_active
       FROM users WHERE id = ?`,
      [req.user.id],
      (err, rows) => {
        if (err) {
          console.error('❌ 獲取 /me 失敗:', err);
          return res.status(500).json({ success: false, error: '伺服器錯誤' });
        }
        if (rows.length === 0) {
          return res.status(404).json({ success: false, error: '用戶不存在' });
        }

        const user = rows[0];
        const lastActive = new Date(user.last_active);
        const now = new Date();
        const diffMinutes = (now - lastActive) / (1000 * 60);
        const isOnline = diffMinutes < 10;

        let avatarUrl = buildAvatarUrl(user.avatar);
        if (avatarUrl && !avatarUrl.startsWith('http')) {
          avatarUrl = `${process.env.BASE_URL || 'http://localhost:3000'}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
        }

        res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: avatarUrl,
            mbti: user.mbti || null,
            points: user.points || 0,
            status: user.status || 'active',
            last_active: user.last_active,
            is_online: isOnline
          }
        });
      }
    );
  });

  // 心跳 API
  router.post('/heartbeat', authMiddleware(JWT_SECRET), (req, res) => {
    const userId = req.user.id;
    const now = new Date();

    connection.query(
      'UPDATE users SET last_active = NOW() WHERE id = ?',
      [userId],
      (err, result) => {
        if (err) {
          console.error('❌ 心跳更新失敗:', err);
          return res.status(500).json({ success: false, error: '伺服器錯誤' });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, error: '用戶不存在' });
        }

        connection.query(
          'SELECT last_active FROM users WHERE id = ?',
          [userId],
          (err, rows) => {
            res.json({
              success: true,
              timestamp: now.toISOString(),
              last_active: rows[0]?.last_active
            });
          }
        );
      }
    );
  });

  return router;
};