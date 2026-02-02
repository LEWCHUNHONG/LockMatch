// routes/chat.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

module.exports = (connection, authMiddleware, JWT_SECRET, buildAvatarUrl, BASE_URL, uploadMedia, broadcastNewMessage, io) => {

  // 獲取我的所有聊天室列表（1對1 + 群組）
  router.get('/chat-rooms', authMiddleware(JWT_SECRET), (req, res) => {
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

// 創建私聊聊天室
router.post('/create-private-chat', authMiddleware(JWT_SECRET), (req, res) => {
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

  // 獲取聊天室統計資訊
  router.get('/chat-stats/:roomId', authMiddleware(JWT_SECRET), (req, res) => {
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


// 獲取聊天室詳情
router.get('/chat-room/:roomId', authMiddleware(JWT_SECRET), (req, res) => {
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
router.get('/chat-messages/:roomId', authMiddleware(JWT_SECRET), (req, res) => {
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
router.post('/send-message', authMiddleware(JWT_SECRET), (req, res) => {
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
router.post('/send-media-message', authMiddleware(JWT_SECRET), uploadMedia.single('file'), (req, res) => {
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
router.post('/mark-as-read', authMiddleware(JWT_SECRET), (req, res) => {
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
router.get('/message-read-status/:messageId', authMiddleware(JWT_SECRET), (req, res) => {
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

// ==================== 獲取聊天室多媒體消息 ====================
router.get('/chat-media/:roomId', authMiddleware(JWT_SECRET), (req, res) => {
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


  return router;
};