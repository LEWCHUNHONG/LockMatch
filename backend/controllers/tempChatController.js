// controllers/tempChatController.js
const connection = require('../db/connection');

const socketModule = require('../socket/socket');
const tempChatMessageCount = socketModule.tempChatMessageCount;


const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

// 發送邀請
exports.sendInvite = async (req, res) => {
    const fromUserId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
        return res.status(400).json({ success: false, error: '請指定對象' });
    }

    try {
        // 檢查目標用戶是否存在
        const userRows = await query('SELECT id FROM users WHERE id = ?', [targetUserId]);
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, error: '用戶不存在' });
        }

        // 檢查是否已有相同方向的 pending 邀請
        const existing = await query(
            'SELECT id FROM temp_chat_invites WHERE from_user_id = ? AND to_user_id = ? AND status = "pending"',
            [fromUserId, targetUserId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: '已經有待處理嘅邀請' });
        }

        // 插入邀請記錄
        const insertResult = await query(
            'INSERT INTO temp_chat_invites (from_user_id, to_user_id, status) VALUES (?, ?, "pending")',
            [fromUserId, targetUserId]
        );
        const inviteId = insertResult.insertId;
        console.log(`✅ 邀請插入成功，inviteId: ${inviteId} (from=${fromUserId}, to=${targetUserId})`);

        // 獲取發送方用戶名（用於通知）
        const [fromUser] = await query('SELECT username FROM users WHERE id = ?', [fromUserId]);

        // Socket 通知接收方
        const io = req.app.get('io');
        if (io) {
            const receiverRoom = `user_${targetUserId}`;
            io.to(receiverRoom).emit('temp-chat-invite', {
                inviteId,
                fromUserId,
                fromUsername: fromUser.username,
            });
            console.log(`📡 已向接收方 ${targetUserId} 發送 temp-chat-invite 事件`);
        }

        res.json({ success: true, inviteId });
    } catch (error) {
        console.error('❌ 發送邀請失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
};

// 接受邀請
exports.acceptInvite = async (req, res) => {
    const userId = req.user.id;
    const { inviteId } = req.body;

    try {
        // 查詢 pending 邀請
        const invites = await query(
            'SELECT * FROM temp_chat_invites WHERE id = ? AND to_user_id = ? AND status = "pending"',
            [inviteId, userId]
        );
        if (invites.length === 0) {
            return res.status(404).json({ success: false, error: '邀請不存在或已處理' });
        }
        const invite = invites[0];

        // 獲取雙方用戶名
        const [fromUser, toUser] = await Promise.all([
            query('SELECT username FROM users WHERE id = ?', [invite.from_user_id]).then(r => r[0]),
            query('SELECT username FROM users WHERE id = ?', [userId]).then(r => r[0])
        ]);

        // 創建臨時聊天室
        const roomName = `臨時聊天-${fromUser.username}-${toUser.username}`;
        const roomResult = await query(
            'INSERT INTO chat_rooms (name, type, is_temp, created_at) VALUES (?, "private", TRUE, NOW())',
            [roomName]
        );
        const roomId = roomResult.insertId;

        // 添加成員
        await query(
            'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?), (?, ?)',
            [roomId, invite.from_user_id, roomId, userId]
        );

        // 更新邀請狀態為 accepted，並記錄 room_id
        await query(
            'UPDATE temp_chat_invites SET status = "accepted", room_id = ? WHERE id = ?',
            [roomId, inviteId]
        );

        // 初始化臨時聊天計數器
        if (tempChatMessageCount && typeof tempChatMessageCount.set === 'function') {
            tempChatMessageCount.set(roomId.toString(), 0);
            console.log(`✅ 臨時聊天室 ${roomId} 計數器初始化為 0`);
        } else {
            console.warn('⚠️ tempChatMessageCount 未正確導入，跳過計數器初始化');
        }

        // Socket 通知雙方
        const io = req.app.get('io');
        if (io) {
            // 發送給發送方（如果在線）
            const senderRoom = `user_${invite.from_user_id}`;
            const senderSockets = await io.in(senderRoom).fetchSockets();
            if (senderSockets.length > 0) {
                io.to(senderRoom).emit('temp-chat-accepted', {
                    inviteId,
                    roomId,
                    withUserId: userId,
                    withUsername: toUser.username,
                });
                io.to(receiverRoom).emit('temp-chat-accepted', {
                    inviteId,
                    roomId,
                    withUserId: invite.from_user_id,
                    withUsername: fromUser.username,
                });
                console.log(`✅ 已向發送方 ${invite.from_user_id} 發送 temp-chat-accepted 事件`);
            } else {
                console.log(`📝 發送方 ${invite.from_user_id} 不在線，等待其下次上線時輪詢進入`);
            }

            // 發送給接收方（自己）
            const receiverRoom = `user_${userId}`;
            io.to(receiverRoom).emit('temp-chat-accepted', {
                inviteId,
                roomId,
                withUserId: invite.from_user_id,
                withUsername: fromUser.username,
            });
            console.log(`✅ 已向接收方 ${userId} 發送 temp-chat-accepted 事件`);
        }

        res.json({ success: true, roomId, otherUserId: invite.from_user_id });
    } catch (error) {
        console.error('❌ 接受邀請失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
};

// 拒絕邀請
exports.rejectInvite = async (req, res) => {
    const userId = req.user.id;
    const { inviteId } = req.body;

    try {
        const result = await query(
            'UPDATE temp_chat_invites SET status = "rejected" WHERE id = ? AND to_user_id = ? AND status = "pending"',
            [inviteId, userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: '邀請不存在或已處理' });
        }

        const invite = await query('SELECT from_user_id FROM temp_chat_invites WHERE id = ?', [inviteId]);
        if (invite.length > 0) {
            const io = req.app.get('io');
            if (io) {
                io.to(`user_${invite[0].from_user_id}`).emit('temp-chat-rejected', { inviteId });
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('拒絕邀請失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
};

// 獲取待處理邀請（作為接收方）
exports.getPendingInvites = async (req, res) => {
    const userId = req.user.id;
    try {
        const invites = await query(
            `SELECT ti.*, u.username as from_username, u.avatar as from_avatar
             FROM temp_chat_invites ti
             JOIN users u ON ti.from_user_id = u.id
             WHERE ti.to_user_id = ? AND ti.status = "pending"
             ORDER BY ti.created_at DESC`,
            [userId]
        );
        const API_BASE = process.env.API_URL || 'http://localhost:3000';
        const formatted = invites.map(inv => ({
            ...inv,
            from_avatar: inv.from_avatar ? (inv.from_avatar.startsWith('http') ? inv.from_avatar : `${API_BASE}${inv.from_avatar}`) : null,
        }));
        res.json({ success: true, invites: formatted });
    } catch (error) {
        console.error('獲取待處理邀請失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
};

exports.getPendingAccepted = async (req, res) => {
    const userId = req.user.id;
    try {
        const rows = await query(
            `SELECT ti.id, ti.room_id, ti.to_user_id, u.username as with_username
             FROM temp_chat_invites ti
             JOIN users u ON ti.to_user_id = u.id
             WHERE ti.from_user_id = ? AND ti.status = 'accepted'
             ORDER BY ti.created_at DESC
             LIMIT 1`,
            [userId]
        );
        if (rows.length > 0) {
            res.json({ success: true, pending: rows[0] });
        } else {
            res.json({ success: true, pending: null });
        }
    } catch (error) {
        console.error('獲取待處理已接受邀請失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
};