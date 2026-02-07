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
  // 登入 API - 添加完整調試
  router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // +++ 重要：添加調試 +++
    console.log('🔍 === 登入調試開始 ===');
    console.log('🔍 輸入的用戶名:', username);
    console.log('🔍 輸入的密碼:', password);

    connection.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
      if (err) {
        console.log('❌ 查詢錯誤:', err);
        return res.status(400).json({ error: '帳號或密碼錯誤' });
      }

      console.log('🔍 查詢結果數量:', results.length);

      if (results.length === 0) {
        console.log('❌ 用戶不存在');
        return res.status(400).json({ error: '帳號或密碼錯誤' });
      }

      const user = results[0];
      console.log('🔍 找到用戶:', user.username);
      console.log('🔍 資料庫中的密碼:', user.password);
      console.log('🔍 密碼長度:', user.password ? user.password.length : 'null');

      if (user.password) {
        console.log('🔍 密碼開頭字符:', user.password.substring(0, 10));
      }

      // 嘗試 bcrypt 比對
      const match = await bcrypt.compare(password, user.password);
      console.log('🔍 bcrypt.compare 結果:', match);

      // 如果 bcrypt 比對失敗，嘗試直接比對
      if (!match && user.password === password) {
        console.log('🔍 直接比對成功（明文密碼）');
        match = true;
      }

      console.log('🔍 最終比對結果:', match);

      if (!match) {
        console.log('❌ 所有比對方式都失敗');
        return res.status(400).json({ error: '帳號或密碼錯誤' });
      }

      console.log('✅ 密碼驗證成功');

      // ... 其餘代碼不變 ...
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
  router.get('/me', authMiddleware(JWT_SECRET), async (req, res) => {
    try {
      console.log('👤 獲取目前使用者資訊, userId:', req.user.id);

      const [rows] = await connection.promise().query(
        `SELECT 
         id, username, email, avatar, mbti, points, status, 
         last_active 
       FROM users 
       WHERE id = ?`,
        [req.user.id]
      );

      if (rows.length === 0) {
        console.log('❌ 用戶不存在, userId:', req.user.id);
        return res.status(404).json({
          success: false,
          error: '用戶不存在'
        });
      }

      const user = rows[0];

      // 計算在線狀態 - 改為10分鐘內都算在線
      const lastActive = new Date(user.last_active);
      const now = new Date();
      const diffMinutes = (now - lastActive) / (1000 * 60);
      const isOnline = diffMinutes < 10; // 改為10分鐘內算在線

      // 處理頭像 URL
      let avatarUrl = user.avatar ? buildAvatarUrl(user.avatar) : null;
      // 如果 buildAvatarUrl 沒處理完整，再做一次保險
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        avatarUrl = `${BASE_URL}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
      }

      console.log('✅ 成功獲取用戶資訊:', {
        id: user.id,
        username: user.username,
        mbti: user.mbti || '尚未設定',
        points: user.points || 0,
        is_online: isOnline,
        last_active: user.last_active,
        diff_minutes: diffMinutes.toFixed(2)
      });

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
          created_at: user.created_at,
          is_online: isOnline
        }
      });

    } catch (err) {
      console.error('❌ 獲取 /me 失敗:', err);
      res.status(500).json({
        success: false,
        error: '伺服器錯誤，無法獲取使用者資訊',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // 心跳 API - 更新最後活動時間
  router.post('/heartbeat', authMiddleware(JWT_SECRET), async (req, res) => {
    try {
      const userId = req.user.id;
      const now = new Date();

      // 使用 promise 版本以確保非同步操作完成
      const [result] = await connection.promise().query(
        'UPDATE users SET last_active = NOW() WHERE id = ?',
        [userId]
      );

      // 檢查是否成功更新
      if (result.affectedRows === 0) {
        console.error(`❌ 用戶 ${userId} 不存在，無法更新心跳`);
        return res.status(404).json({
          success: false,
          error: '用戶不存在'
        });
      }

      console.log(`❤️ 更新用戶 ${userId} 最後活動時間: ${now.toISOString()}`);

      // 獲取更新後的時間
      const [rows] = await connection.promise().query(
        'SELECT last_active FROM users WHERE id = ?',
        [userId]
      );

      res.json({
        success: true,
        timestamp: now.toISOString(),
        last_active: rows[0]?.last_active
      });

    } catch (err) {
      console.error('❌ 心跳更新失敗:', err);
      res.status(500).json({
        success: false,
        error: '心跳更新失敗',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  return router;
};