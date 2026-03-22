// routes/user.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// 假設你已經有這些依賴從 app.js 傳入
module.exports = (connection, authMiddleware, buildAvatarUrl, avatarUpload, JWT_SECRET, BASE_URL) => {

  // =============================================
  //  上傳頭像 API
  //  POST /api/upload-avatar
  // =============================================
  router.post('/upload-avatar', authMiddleware(JWT_SECRET), avatarUpload.single('avatar'), (req, res) => {
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

              const oldFilePath = path.join(process.cwd(), oldAvatar);  // 使用 process.cwd() 確保正確根目錄

              fs.unlink(oldFilePath, (unlinkErr) => {
                if (unlinkErr) {
                  console.error('刪除舊頭像失敗:', unlinkErr);
                }
              });
            }

            res.json({
              success: true,
              avatar: avatarUrl,
              message: '頭像更新成功'
            });
          }
        );
      }
    );
  });

  // =============================================
  //  刪除頭像 API
  //  DELETE /api/delete-avatar
  // =============================================
  router.delete('/delete-avatar', authMiddleware(JWT_SECRET), (req, res) => {
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
        const filePath = path.join(process.cwd(), currentAvatar);
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) console.error('刪除舊頭像檔案失敗:', err);
          });
        }

        res.json({ success: true, avatar: defaultUrl });
      });
    });
  });

  // =============================================
  //  更新個人資料 API
  //  PUT /api/update-profile
  // =============================================
router.put('/update-profile', authMiddleware(JWT_SECRET), (req, res) => {
  const { username, email, status, bio } = req.body;

  // 改用 hasOwnProperty 或 in 來判斷是否有傳入任何欄位
  const hasUpdate = 
    'username' in req.body ||
    'email' in req.body ||
    'status' in req.body ||    // 即使是 null 或 "" 也算有更新意圖
    'bio' in req.body;

  if (!hasUpdate) {
    return res.status(400).json({ error: '請提供至少一項更新資訊' });
  }

  let updates = [];
  let params = [];

  if ('username' in req.body) {
    updates.push('username = ?');
    params.push(username);
  }
  if ('email' in req.body) {
    updates.push('email = ?');
    params.push(email);
  }
  if ('status' in req.body) {
    updates.push('status = ?');
    const finalStatus = (status === null || (typeof status === 'string' && status.trim() === ''))
      ? null
      : (status ? status.trim().slice(0, 255) : null);
    params.push(finalStatus);
  }
  if ('bio' in req.body) {
    const trimmedBio = (bio === null || (typeof bio === 'string' && bio.trim() === ''))
      ? null
      : (bio ? bio.trim() : null);
    updates.push('bio = ?');
    params.push(trimmedBio);
  }

  params.push(req.user.id);

  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

  connection.query(query, params, (err) => {
    if (err) {
      console.error('更新個人資料失敗:', err);
      return res.status(500).json({ error: '更新失敗', detail: err.sqlMessage || err.message });
    }
    res.json({ success: true, message: '個人資料更新成功' });
  });
});

  // =============================================
  //  專用 API：更新 MBTI 結果
  //  PUT /api/update-mbti
  // =============================================
  router.put('/update-mbti', authMiddleware(JWT_SECRET), async (req, res) => {
    try {
      const { mbti } = req.body;
      const userId = req.user.id;

      console.log('🧠 更新 MBTI 請求:', { userId, mbti });

      if (!mbti) {
        console.log('❌ MBTI 參數缺失');
        return res.status(400).json({
          success: false,
          error: 'MBTI 參數缺失'
        });
      }

      // 建議加上這兩行，讓輸入更寬容且資料統一
      const normalizedMbti = mbti.trim().toUpperCase();

      if (!/^[IE][SN][TF][JP]$/.test(normalizedMbti)) {
        console.log('❌ 無效的 MBTI 格式:', normalizedMbti);
        return res.status(400).json({
          success: false,
          error: '無效的 MBTI 類型格式，應為 4 個字母，如 INTJ'
        });
      }

      // 更新 users 表
      const [updateResult] = await connection.promise().query(
        'UPDATE users SET mbti = ? WHERE id = ?',
        [normalizedMbti, userId]
      );

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: '用戶不存在'
        });
      }

      // 記錄到 mbti_history（這部分很重要，會觸發 rewards 的每日任務）
      try {
        await connection.promise().query(`
        CREATE TABLE IF NOT EXISTS mbti_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          mbti_type VARCHAR(4) NOT NULL,
          test_mode VARCHAR(50) DEFAULT 'app',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

        await connection.promise().query(
          `INSERT INTO mbti_history (user_id, mbti_type, test_mode) 
         VALUES (?, ?, 'app')`,
          [userId, normalizedMbti]
        );
        console.log('✅ MBTI 歷史記錄成功');
      } catch (historyErr) {
        console.warn('⚠️ 記錄 MBTI 歷史失敗:', historyErr.message);
        // 不影響主流程
      }

      // 回傳更新後的使用者資訊（跟 /me 類似）
      const [users] = await connection.promise().query(
        'SELECT id, username, email, avatar, mbti, points, status FROM users WHERE id = ?',
        [userId]
      );

      let user = users[0];

      // 處理 avatar URL
      if (user.avatar && !user.avatar.startsWith('http')) {
        user.avatar = `${BASE_URL}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`;
      }

      console.log(`✅ 用戶 ${userId} 更新 MBTI 為: ${normalizedMbti}`);

      res.json({
        success: true,
        message: 'MBTI 更新成功',
        mbti: normalizedMbti,
        user: user
      });

    } catch (err) {
      console.error('❌ 更新 MBTI 失敗:', err);
      res.status(500).json({
        success: false,
        error: '更新 MBTI 失敗',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // =============================================
  //  根據 MBTI 匹配用戶
  //  GET /api/mbti-matches
  // =============================================
  router.get('/mbti-matches', authMiddleware(JWT_SECRET), (req, res) => {
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

  // 記錄 MBTI 測試歷史的路由
  router.post('/record-mbti-test', authMiddleware(JWT_SECRET), async (req, res) => {
    try {
      const { mbtiType, testMode } = req.body;
      const userId = req.user.id;

      console.log('📝 記錄 MBTI 測試歷史:', { userId, mbtiType, testMode });

      // 創建 mbti_history 表（如果不存在）
      await connection.promise().query(`
      CREATE TABLE IF NOT EXISTS mbti_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        mbti_type VARCHAR(4) NOT NULL,
        test_mode VARCHAR(50) DEFAULT 'traditional',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

      // 插入測試記錄
      await connection.promise().query(
        `INSERT INTO mbti_history (user_id, mbti_type, test_mode) 
       VALUES (?, ?, ?)`,
        [userId, mbtiType, testMode]
      );

      console.log('✅ MBTI 測試歷史記錄成功');

      res.json({
        success: true,
        message: '測試歷史記錄成功'
      });
    } catch (err) {
      console.error('❌ 記錄 MBTI 測試歷史失敗:', err);
      res.status(500).json({
        success: false,
        error: '記錄測試歷史失敗',
        details: err.message
      });
    }
  });





  // =============================================
  //  獲取指定用戶的公開資料（用於臨時聊天等）
  //  GET /api/user/:userId
  // =============================================
  router.get('/user/:userId', authMiddleware(JWT_SECRET), async (req, res) => {
    try {
      const targetUserId = req.params.userId;
      // 查詢用戶基本資料，包含 mbti
      const [rows] = await connection.promise().query(
        'SELECT id, username, avatar, mbti, status, bio FROM users WHERE id = ?',
        [targetUserId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: '用戶不存在' });
      }
      let user = rows[0];
      // 處理頭像 URL
      if (user.avatar && !user.avatar.startsWith('http')) {
        user.avatar = buildAvatarUrl(user.avatar);
      }
      res.json({ success: true, user });
    } catch (err) {
      console.error('❌ 獲取用戶資料失敗:', err);
      res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
  });

  return router;
};