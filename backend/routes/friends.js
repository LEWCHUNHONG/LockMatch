// routes/friends.js
const express = require('express');
const router = express.Router();

module.exports = (connection, authMiddleware, JWT_SECRET, buildAvatarUrl, BASE_URL, io) => {

  // 獲取我的好友列表
  router.get('/friends', authMiddleware(JWT_SECRET), (req, res) => {
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

  // 搜尋用戶（可加為好友）
  router.get('/search-users', authMiddleware(JWT_SECRET), (req, res) => {
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

  // 發送好友請求
  router.post('/friend-request', authMiddleware(JWT_SECRET), (req, res) => {
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

// 接受好友請求
router.post('/accept-friend-request', authMiddleware(JWT_SECRET), (req, res) => {
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
router.post('/decline-friend-request', authMiddleware(JWT_SECRET), (req, res) => {
  const { requestId } = req.body;
  
  connection.query(
    'UPDATE friend_requests SET status = "rejected" WHERE id = ? AND to_user_id = ?',
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

// 獲取待處理的好友請求
router.get('/pending-friend-requests', authMiddleware(JWT_SECRET), (req, res) => {
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

  return router;
};