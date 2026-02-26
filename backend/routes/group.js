// routes/group.js
const express = require('express');
const router = express.Router();

module.exports = (connection, authMiddleware, JWT_SECRET, buildAvatarUrl, BASE_URL, uploadMedia, broadcastNewMessage, io) => {

  router.post('/create-group', authMiddleware(JWT_SECRET), (req, res) => {
    const { name, description, userIds } = req.body;

    if (!name || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: '請填寫群組名稱並選擇至少一名成員' });
    }

    connection.beginTransaction(err => {
      if (err) return res.status(500).json({ error: '交易失敗' });

      // 創建群組聊天室
      connection.query(
        'INSERT INTO chat_rooms (name, type, description, created_at) VALUES (?, "group", ?, NOW())',
        [name, description || ''],
        (err, result) => {
          if (err) {
            return connection.rollback(() => {
              console.error('創建群組失敗:', err);
              res.status(500).json({ error: '創建群組失敗' });
            });
          }

          const roomId = result.insertId;

          // 將創建者加入群組成員
          connection.query(
            'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
            [roomId, req.user.id],
            (err) => {
              if (err) {
                return connection.rollback(() => {
                  res.status(500).json({ error: '添加創建者失敗' });
                });
              }

              // 如果沒有選擇其他人，直接提交
              if (userIds.length === 0) {
                return connection.commit(err => {
                  if (err) return connection.rollback(() => res.status(500).json({ error: '提交失敗' }));
                  res.json({ success: true, roomId, message: '群組創建成功' });
                });
              }

              // 為每個被選中的人創建邀請記錄
              const inviteValues = userIds.map(userId => [roomId, req.user.id, userId]);
              connection.query(
                'INSERT INTO group_invites (group_id, from_user_id, to_user_id) VALUES ?',
                [inviteValues],
                (err) => {
                  if (err) {
                    console.error('創建邀請失敗:', err);
                    return connection.rollback(() => {
                      res.status(500).json({ error: '創建邀請失敗' });
                    });
                  }

                  connection.commit(err => {
                    if (err) {
                      return connection.rollback(() => res.status(500).json({ error: '提交失敗' }));
                    }

                    // 通知每個被邀請的人
                    userIds.forEach(userId => {
                      const io = req.app.get('io');
                      if (io) {
                        io.to(`user_${userId}`).emit('new-group-invite', {
                          groupId: roomId,
                          groupName: name,
                          fromUserId: req.user.id,
                          fromUsername: req.user.username,
                          timestamp: new Date()
                        });
                      }
                    });

                    res.json({ success: true, roomId, message: '群組創建成功，已發送邀請' });
                  });
                }
              );
            }
          );
        }
      );
    });
  });

  // 獲取群組成員列表
  router.get('/group-members/:roomId', authMiddleware(JWT_SECRET), (req, res) => {
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
  router.post('/add-group-member', authMiddleware(JWT_SECRET), (req, res) => {
    const { roomId, userId } = req.body;

    if (!roomId || !userId) {
      return res.status(400).json({ error: '缺少必要參數' });
    }

    // 先查聊天室是否存在 + 拿名稱 + 確認是群組
    connection.query(
      'SELECT id, name, type FROM chat_rooms WHERE id = ?',
      [roomId],
      (err, roomResults) => {
        if (err) return res.status(500).json({ error: '資料庫錯誤' });
        if (roomResults.length === 0) {
          return res.status(404).json({ error: '聊天室不存在' });
        }

        const room = roomResults[0];
        if (room.type !== 'group') {
          return res.status(400).json({ error: '只能向群組添加成員' });
        }

        const roomName = room.name;

        // 再檢查是否已在群組
        connection.query(
          'SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ?',
          [roomId, userId],
          (err, memberCheck) => {
            if (err) return res.status(500).json({ error: '資料庫錯誤' });
            if (memberCheck.length > 0) {
              return res.status(400).json({ error: '用戶已在群組中' });
            }

            // 執行添加
            connection.query(
              'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
              [roomId, userId],
              (err) => {
                if (err) {
                  console.error('添加成員失敗:', err);
                  return res.status(500).json({ error: '添加成員失敗' });
                }

                // 通知被加入的人
                io.to(`user_${userId}`).emit('added-to-group', {
                  roomId: roomId,
                  roomName: roomName   // ← 現在是正確的
                });

                // 通知群組其他成員
                io.to(roomId).emit('group-member-added', {
                  roomId: roomId,
                  userId: userId,
                  addedBy: req.user.id
                });

                // 回傳新增的用戶資訊
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
  // 移除群組成員
  router.post('/remove-group-member', authMiddleware(JWT_SECRET), (req, res) => {
    const { roomId, userId } = req.body;

    if (!roomId || !userId) {
      return res.status(400).json({ error: '缺少必要參數' });
    }

    // 禁止踢自己（應由 leave-group 處理）
    if (userId == req.user.id) {
      return res.status(400).json({ error: '不能移除自己，請使用退出功能' });
    }

    connection.beginTransaction(err => {
      if (err) return res.status(500).json({ error: '無法開始交易' });

      // 1. 確認聊天室存在且為群組
      connection.query(
        'SELECT type, name FROM chat_rooms WHERE id = ? FOR UPDATE',
        [roomId],
        (err, roomResults) => {
          if (err || roomResults.length === 0) {
            return connection.rollback(() => res.status(404).json({ error: '聊天室不存在' }));
          }
          if (roomResults[0].type !== 'group') {
            return connection.rollback(() => res.status(400).json({ error: '只能從群組移除成員' }));
          }

          const roomName = roomResults[0].name;

          // 2. 執行移除
          connection.query(
            'DELETE FROM chat_room_members WHERE room_id = ? AND user_id = ?',
            [roomId, userId],
            (err, result) => {
              if (err) {
                return connection.rollback(() => res.status(500).json({ error: '移除成員失敗' }));
              }
              if (result.affectedRows === 0) {
                return connection.rollback(() => res.status(404).json({ error: '該成員不在群組中' }));
              }

              // 3. 檢查剩餘人數
              connection.query(
                'SELECT COUNT(*) as count FROM chat_room_members WHERE room_id = ?',
                [roomId],
                (err, countResult) => {
                  if (err) {
                    return connection.rollback(() => res.status(500).json({ error: '查詢失敗' }));
                  }

                  const remaining = countResult[0].count;
                  const groupWillBeDeleted = remaining === 0;

                  let deletePromise = Promise.resolve();
                  if (groupWillBeDeleted) {
                    deletePromise = new Promise((resolve, reject) => {
                      connection.query(
                        'DELETE FROM chat_rooms WHERE id = ?',
                        [roomId],
                        (err) => err ? reject(err) : resolve()
                      );
                    });

                    // 可選：刪除訊息
                    // deletePromise = deletePromise.then(() => new Promise(r => {
                    //   connection.query('DELETE FROM messages WHERE room_id = ?', [roomId], () => r());
                    // }));
                  }

                  deletePromise
                    .then(() => {
                      connection.commit(err => {
                        if (err) {
                          return connection.rollback(() => res.status(500).json({ error: '提交失敗' }));
                        }

                        // 4. 發送通知
                        io.to(`user_${userId}`).emit('removed-from-group', {
                          roomId,
                          roomName,
                          removedBy: req.user.id,
                          wasLastMember: groupWillBeDeleted
                        });

                        if (!groupWillBeDeleted) {
                          io.to(roomId).emit('group-member-removed', {
                            roomId,
                            userId,
                            removedBy: req.user.id,
                            username: '某成員' // 可再查詢真實 username
                          });
                        }

                        res.json({
                          success: true,
                          groupDeleted: groupWillBeDeleted
                        });
                      });
                    })
                    .catch(err => {
                      connection.rollback(() => res.status(500).json({ error: '刪除群組失敗' }));
                    });
                }
              );
            }
          );
        }
      );
    });
  });

  // 成員主動退出群組
  router.post('/leave-group', authMiddleware(JWT_SECRET), (req, res) => {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: '缺少群組 ID' });
    }

    connection.beginTransaction(err => {
      if (err) {
        return res.status(500).json({ error: '無法開始資料庫交易' });
      }

      // 1. 確認聊天室存在且為群組
      connection.query(
        'SELECT type, name FROM chat_rooms WHERE id = ? FOR UPDATE',
        [roomId],
        (err, roomResults) => {
          if (err) {
            return connection.rollback(() => res.status(500).json({ error: '資料庫錯誤' }));
          }
          if (roomResults.length === 0) {
            return connection.rollback(() => res.status(404).json({ error: '群組不存在' }));
          }
          if (roomResults[0].type !== 'group') {
            return connection.rollback(() => res.status(400).json({ error: '該聊天室不是群組' }));
          }

          const roomName = roomResults[0].name;

          // 2. 確認使用者在群組內
          connection.query(
            'SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ? FOR UPDATE',
            [roomId, req.user.id],
            (err, memberCheck) => {
              if (err) {
                return connection.rollback(() => res.status(500).json({ error: '資料庫錯誤' }));
              }
              if (memberCheck.length === 0) {
                return connection.rollback(() => res.status(400).json({ error: '你不在此群組中' }));
              }

              // 3. 刪除自己成員記錄
              connection.query(
                'DELETE FROM chat_room_members WHERE room_id = ? AND user_id = ?',
                [roomId, req.user.id],
                (err, deleteResult) => {
                  if (err) {
                    return connection.rollback(() => res.status(500).json({ error: '退出群組失敗' }));
                  }
                  if (deleteResult.affectedRows === 0) {
                    return connection.rollback(() => res.status(400).json({ error: '退出失敗' }));
                  }

                  // 4. 檢查目前剩餘成員數
                  connection.query(
                    'SELECT COUNT(*) as count FROM chat_room_members WHERE room_id = ?',
                    [roomId],
                    (err, countResult) => {
                      if (err) {
                        return connection.rollback(() => res.status(500).json({ error: '查詢成員數失敗' }));
                      }

                      const remaining = countResult[0].count;
                      const groupWillBeDeleted = remaining === 0;

                      // 5. 如果沒人了，刪除群組
                      let deleteRoomPromise = Promise.resolve();
                      if (groupWillBeDeleted) {
                        deleteRoomPromise = new Promise((resolve, reject) => {
                          connection.query(
                            'DELETE FROM chat_rooms WHERE id = ?',
                            [roomId],
                            (err) => {
                              if (err) {
                                console.error('刪除空群組失敗:', err);
                                reject(err);
                              } else {
                                resolve();
                              }
                            }
                          );
                        });

                        // 可選：同時刪除該群組所有歷史訊息（視需求決定是否開啟）
                        deleteRoomPromise = deleteRoomPromise.then(() => new Promise((resolve) => {
                          connection.query('DELETE FROM messages WHERE room_id = ?', [roomId], () => resolve());
                        }));
                      }

                      deleteRoomPromise
                        .then(() => {
                          connection.commit(err => {
                            if (err) {
                              return connection.rollback(() => res.status(500).json({ error: '提交交易失敗' }));
                            }

                            // 6. 發送通知
                            // 通知自己（無論群組是否刪除）
                            io.to(`user_${req.user.id}`).emit('left-group', {
                              roomId,
                              roomName,
                              wasLastMember: groupWillBeDeleted,
                              message: groupWillBeDeleted ? '你是最後一人，已自動解散群組' : '已退出群組'
                            });

                            // 如果還有其他人，通知群組有人離開
                            if (!groupWillBeDeleted) {
                              io.to(roomId).emit('group-member-removed', {
                                roomId,
                                userId: req.user.id,
                                removedBy: req.user.id,
                                isSelfLeave: true,
                                username: req.user.username || '某成員'
                              });
                            }

                            res.json({
                              success: true,
                              message: groupWillBeDeleted ? '已退出並解散群組' : '已成功退出群組',
                              groupDeleted: groupWillBeDeleted
                            });
                          });
                        })
                        .catch(err => {
                          connection.rollback(() => res.status(500).json({ error: '刪除群組失敗' }));
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
  });

  return router;
};