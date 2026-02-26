// controllers/friendController.js
const db = require('../db/connection');

// 接受好友請求
exports.acceptFriendRequest = (req, res) => {
    const { requestId } = req.body;
    const userId = req.user.id;

    // 1. 查詢請求
    db.query(
        'SELECT from_user_id, to_user_id FROM friend_requests WHERE id = ? AND status = "pending"',
        [requestId],
        (err, requestRows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, error: '伺服器錯誤' });
            }
            if (requestRows.length === 0) {
                return res.status(404).json({ success: false, error: '好友請求不存在或已處理' });
            }

            const request = requestRows[0];
            if (request.to_user_id !== userId) {
                return res.status(403).json({ success: false, error: '您無權接受此請求' });
            }

            // 2. 更新請求狀態
            db.query(
                'UPDATE friend_requests SET status = "accepted" WHERE id = ?',
                [requestId],
                (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ success: false, error: '更新失敗' });
                    }

                    // 3. 建立好友關係（避免重複）
                    db.query(
                        `INSERT INTO friendships (user1_id, user2_id, status) 
                         SELECT ?, ?, "accepted" FROM DUAL
                         WHERE NOT EXISTS (
                             SELECT 1 FROM friendships 
                             WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
                         )`,
                        [request.from_user_id, request.to_user_id,
                        request.from_user_id, request.to_user_id,
                        request.to_user_id, request.from_user_id],
                        (err) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).json({ success: false, error: '建立好友關係失敗' });
                            }

                            // 4. 檢查或建立聊天室
                            db.query(
                                `SELECT cr.id FROM chat_rooms cr
                                 JOIN chat_room_members crm1 ON cr.id = crm1.room_id
                                 JOIN chat_room_members crm2 ON cr.id = crm2.room_id
                                 WHERE cr.type = 'private'
                                   AND crm1.user_id = ? AND crm2.user_id = ?`,
                                [request.from_user_id, request.to_user_id],
                                (err, roomRows) => {
                                    if (err) {
                                        console.error(err);
                                        return res.status(500).json({ success: false, error: '查詢聊天室失敗' });
                                    }

                                    let roomId = null;
                                    if (roomRows.length === 0) {
                                        // 建立新聊天室
                                        db.query(
                                            'INSERT INTO chat_rooms (type, created_at) VALUES ("private", NOW())',
                                            (err, insertResult) => {
                                                if (err) {
                                                    console.error(err);
                                                    return res.status(500).json({ success: false, error: '建立聊天室失敗' });
                                                }
                                                roomId = insertResult.insertId;

                                                // 加入成員
                                                db.query(
                                                    'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?), (?, ?)',
                                                    [roomId, request.from_user_id, roomId, request.to_user_id],
                                                    (err) => {
                                                        if (err) {
                                                            console.error(err);
                                                            return res.status(500).json({ success: false, error: '加入成員失敗' });
                                                        }
                                                        res.json({ success: true, message: '好友請求已接受', roomId: roomId.toString() });
                                                    }
                                                );
                                            }
                                        );
                                    } else {
                                        roomId = roomRows[0].id;
                                        res.json({ success: true, message: '好友請求已接受', roomId: roomId.toString() });
                                    }
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

// 拒絕好友請求
exports.declineFriendRequest = (req, res) => {
    const { requestId } = req.body;
    const userId = req.user.id;

    db.query(
        'SELECT from_user_id, to_user_id FROM friend_requests WHERE id = ? AND status = "pending"',
        [requestId],
        (err, requestRows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, error: '伺服器錯誤' });
            }
            if (requestRows.length === 0) {
                return res.status(404).json({ success: false, error: '請求不存在' });
            }

            const request = requestRows[0];
            if (request.to_user_id !== userId) {
                return res.status(403).json({ success: false, error: '您無權操作' });
            }

            db.query(
                'UPDATE friend_requests SET status = "rejected" WHERE id = ?',
                [requestId],
                (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ success: false, error: '拒絕失敗' });
                    }

                    // 可選：Socket通知
                    const io = req.app.get('io');
                    if (io) {
                        io.to(`user_${request.from_user_id}`).emit('friend-request-declined', {
                            byUserId: userId,
                            byUsername: req.user.username,
                            timestamp: new Date()
                        });
                    }

                    res.json({ success: true, message: '已拒絕好友請求' });
                }
            );
        }
    );
};

// 發送好友請求
exports.sendFriendRequest = (req, res) => {
    const fromUserId = req.user.id;
    const { toUserId } = req.body;

    if (!toUserId || fromUserId === toUserId) {
        return res.status(400).json({ success: false, error: '無效的請求' });
    }

    // 檢查目標用戶存在
    db.query('SELECT id FROM users WHERE id = ?', [toUserId], (err, userRows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, error: '伺服器錯誤' });
        }
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, error: '用戶不存在' });
        }

        // 檢查是否已是好友
        db.query(
            'SELECT id FROM friendships WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
            [fromUserId, toUserId, toUserId, fromUserId],
            (err, friendRows) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ success: false, error: '伺服器錯誤' });
                }
                if (friendRows.length > 0) {
                    return res.status(400).json({ success: false, error: '你們已經是好友了' });
                }

                // 檢查是否有 pending 請求
                db.query(
                    'SELECT id FROM friend_requests WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)) AND status = "pending"',
                    [fromUserId, toUserId, toUserId, fromUserId],
                    (err, requestRows) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ success: false, error: '伺服器錯誤' });
                        }
                        if (requestRows.length > 0) {
                            return res.status(400).json({ success: false, error: '已經有好友請求待處理' });
                        }

                        // 建立請求
                        db.query(
                            'INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, "pending")',
                            [fromUserId, toUserId],
                            (err) => {
                                if (err) {
                                    console.error(err);
                                    return res.status(500).json({ success: false, error: '發送請求失敗' });
                                }

                                // Socket通知
                                const io = req.app.get('io');
                                if (io) {
                                    io.to(`user_${toUserId}`).emit('new-friend-request', {
                                        fromUserId,
                                        fromUsername: req.user.username,
                                        timestamp: new Date()
                                    });
                                }

                                res.json({ success: true, message: '好友請求已送出' });
                            }
                        );
                    }
                );
            }
        );
    });
};

// 獲取待處理的好友請求
exports.getPendingRequests = (req, res) => {
    const userId = req.user.id;

    db.query(
        `SELECT fr.id, fr.from_user_id, u.username, u.avatar, u.mbti, fr.created_at
         FROM friend_requests fr
         JOIN users u ON fr.from_user_id = u.id
         WHERE fr.to_user_id = ? AND fr.status = 'pending'
         ORDER BY fr.created_at DESC`,
        [userId],
        (err, rows) => {
            if (err) {
                console.error('❌ getPendingRequests 錯誤:', err);
                return res.status(500).json({ success: false, error: '伺服器錯誤' });
            }

            const API_BASE = process.env.API_URL || 'http://localhost:3000';
            const requests = rows.map(row => ({
                id: row.id,
                fromUserId: row.from_user_id,
                username: row.username,
                mbti: row.mbti || '待測',
                avatar: row.avatar
                    ? (row.avatar.startsWith('http') ? row.avatar : `${API_BASE}${row.avatar}`)
                    : null,
                createdAt: row.created_at
            }));

            res.json({ success: true, requests });
        }
    );
};