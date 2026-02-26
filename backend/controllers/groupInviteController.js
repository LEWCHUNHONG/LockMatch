// controllers/groupInviteController.js
const db = require('../db/connection');

exports.sendGroupInvite = (req, res) => {
    const { groupId, toUserId } = req.body;
    const fromUserId = req.user.id;

    if (!groupId || !toUserId) {
        return res.status(400).json({ error: '缺少參數' });
    }
    if (fromUserId === toUserId) {
        return res.status(400).json({ error: '不能邀請自己' });
    }

    // 檢查群組是否存在且為群組類型
    db.query(
        'SELECT type, name FROM chat_rooms WHERE id = ?',
        [groupId],
        (err, roomRows) => {
            if (err) return res.status(500).json({ error: '資料庫錯誤' });
            if (roomRows.length === 0 || roomRows[0].type !== 'group') {
                return res.status(404).json({ error: '群組不存在' });
            }
            const groupName = roomRows[0].name;

            // 檢查邀請者是否在群組中
            db.query(
                'SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ?',
                [groupId, fromUserId],
                (err, memberRows) => {
                    if (err) return res.status(500).json({ error: '資料庫錯誤' });
                    if (memberRows.length === 0) {
                        return res.status(403).json({ error: '您不在群組中' });
                    }

                    // 檢查被邀請者是否已在群組中
                    db.query(
                        'SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ?',
                        [groupId, toUserId],
                        (err, inGroupRows) => {
                            if (err) return res.status(500).json({ error: '資料庫錯誤' });
                            if (inGroupRows.length > 0) {
                                return res.status(400).json({ error: '對方已在群組中' });
                            }

                            // 檢查是否已有待處理的邀請
                            db.query(
                                'SELECT 1 FROM group_invites WHERE group_id = ? AND to_user_id = ? AND status = "pending"',
                                [groupId, toUserId],
                                (err, inviteRows) => {
                                    if (err) return res.status(500).json({ error: '資料庫錯誤' });
                                    if (inviteRows.length > 0) {
                                        return res.status(400).json({ error: '已發送邀請，請勿重複' });
                                    }

                                    // 插入邀請
                                    db.query(
                                        'INSERT INTO group_invites (group_id, from_user_id, to_user_id) VALUES (?, ?, ?)',
                                        [groupId, fromUserId, toUserId],
                                        (err, result) => {
                                            if (err) return res.status(500).json({ error: '發送邀請失敗' });

                                            // Socket 通知被邀請者
                                            const io = req.app.get('io');
                                            if (io) {
                                                io.to(`user_${toUserId}`).emit('new-group-invite', {
                                                    inviteId: result.insertId,
                                                    groupId,
                                                    groupName,
                                                    fromUserId,
                                                    fromUsername: req.user.username,
                                                    timestamp: new Date()
                                                });
                                            }

                                            res.json({ success: true, message: '邀請已發送' });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

// 接受群組邀請
exports.acceptGroupInvite = (req, res) => {
    const { inviteId } = req.body;
    const userId = req.user.id;

    db.query(
        'SELECT group_id, from_user_id FROM group_invites WHERE id = ? AND to_user_id = ? AND status = "pending"',
        [inviteId, userId],
        (err, inviteRows) => {
            if (err) return res.status(500).json({ error: '資料庫錯誤' });
            if (inviteRows.length === 0) {
                return res.status(404).json({ error: '邀請不存在或已處理' });
            }

            const { group_id, from_user_id } = inviteRows[0];

            // 更新邀請狀態為 accepted
            db.query(
                'UPDATE group_invites SET status = "accepted" WHERE id = ?',
                [inviteId],
                (err) => {
                    if (err) return res.status(500).json({ error: '更新失敗' });

                    // 將用戶加入群組成員表
                    db.query(
                        'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
                        [group_id, userId],
                        (err) => {
                            if (err) {
                                // 如果重複加入（理論上不應發生），忽略
                                console.error('加入群組失敗:', err);
                            }

                            // 通知邀請者和群組其他成員
                            const io = req.app.get('io');
                            io.to(`user_${from_user_id}`).emit('group-invite-accepted', {
                                groupId: group_id,
                                userId,
                                username: req.user.username
                            });
                            io.to(group_id).emit('group-member-added', {
                                groupId: group_id,
                                userId,
                                username: req.user.username
                            });

                            res.json({ success: true, message: '已加入群組', groupId: group_id });
                        }
                    );
                }
            );
        }
    );
};

// 拒絕群組邀請
exports.rejectGroupInvite = (req, res) => {
    const { inviteId } = req.body;
    const userId = req.user.id;

    db.query(
        'UPDATE group_invites SET status = "rejected" WHERE id = ? AND to_user_id = ? AND status = "pending"',
        [inviteId, userId],
        (err, result) => {
            if (err) return res.status(500).json({ error: '資料庫錯誤' });
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: '邀請不存在' });
            }
            res.json({ success: true, message: '已拒絕邀請' });
        }
    );
};

// 獲取待處理的群組邀請（給當前用戶）
exports.getPendingGroupInvites = (req, res) => {
    const userId = req.user.id;

    db.query(
        `SELECT gi.id, gi.group_id, cr.name as group_name, gi.from_user_id, 
            u.username as from_username, u.avatar as from_avatar, gi.created_at
     FROM group_invites gi
     JOIN chat_rooms cr ON gi.group_id = cr.id
     JOIN users u ON gi.from_user_id = u.id
     WHERE gi.to_user_id = ? AND gi.status = 'pending'
     ORDER BY gi.created_at DESC`,
        [userId],
        (err, rows) => {
            if (err) {
                console.error('❌ getPendingGroupInvites 錯誤:', err);
                return res.status(500).json({ success: false, error: '伺服器錯誤' });
            }
            const API_BASE = process.env.API_URL || 'http://localhost:3000';
            const invites = rows.map(row => ({
                id: row.id,
                groupId: row.group_id,
                groupName: row.group_name,
                fromUserId: row.from_user_id,
                fromUsername: row.from_username,
                fromAvatar: row.from_avatar ? (row.from_avatar.startsWith('http') ? row.from_avatar : `${API_BASE}${row.from_avatar}`) : null,
                createdAt: row.created_at
            }));
            res.json({ success: true, invites });
        }
    );
};