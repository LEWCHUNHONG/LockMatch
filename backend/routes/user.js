// routes/user.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// 假設你已經有這些依賴從 app.js 傳入
module.exports = (connection, authMiddleware, buildAvatarUrl, avatarUpload, JWT_SECRET) => {

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
    const { username, email, status } = req.body;
    
    if (!username && !email && !status) {
      return res.status(400).json({ error: '請提供至少一項更新資訊' });
    }
    
    let updates = [];
    let params = [];
    
    if (username) {
      updates.push('username = ?');
      params.push(username);
    }
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    
    params.push(req.user.id);
    
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    
    connection.query(query, params, (err) => {
      if (err) {
        console.error('更新個人資料失敗:', err);
        return res.status(500).json({ error: '更新失敗' });
      }
      res.json({ success: true, message: '個人資料更新成功' });
    });
  });

  // =============================================
  //  專用 API：更新 MBTI 結果
  //  POST /api/update-mbti
  // =============================================
  router.post('/update-mbti', authMiddleware(JWT_SECRET), (req, res) => {
    const { mbti } = req.body;
    
    if (!mbti || mbti.length !== 4) {
      return res.status(400).json({ error: '無效的 MBTI 類型' });
    }
    
    connection.query(
      'UPDATE users SET mbti = ? WHERE id = ?',
      [mbti.toUpperCase(), req.user.id],
      (err) => {
        if (err) {
          console.error('更新 MBTI 失敗:', err);
          return res.status(500).json({ error: '更新失敗' });
        }
        res.json({ success: true, message: 'MBTI 更新成功', mbti: mbti.toUpperCase() });
      }
    );
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

  return router;
};