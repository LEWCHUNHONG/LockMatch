// routes/instantChat.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const connection = require('../db/connection');

const query = (sql, params) => new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
    });
});

// ====================== 動態載入 Expo (解決 ESM 錯誤) ======================
let ExpoClass = null;
let expoInstance = null;

async function getExpo() {
    if (!ExpoClass) {
        const expoModule = await import('expo-server-sdk');
        ExpoClass = expoModule.Expo;
        expoInstance = new ExpoClass();
    }
    return { Expo: ExpoClass, expo: expoInstance };
}
// ===========================================================================

// 發送推送通知的輔助函數
async function sendPushNotification(targetUserId, notification) {
    try {
        const { Expo, expo } = await getExpo();

        const pushTokenRow = await query('SELECT expo_push_token FROM users WHERE id = ?', [targetUserId]);
        const pushToken = pushTokenRow[0]?.expo_push_token;

        if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
            return;
        }

        await expo.sendPushNotificationsAsync([{
            to: pushToken,
            sound: 'default',
            title: notification.title,
            body: notification.body,
            data: notification.data
        }]);
    } catch (err) {
        console.error('推送通知失敗:', err);
    }
}

// 發送邀請
router.post('/invite', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const fromUserId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) return res.status(400).json({ success: false, error: '請指定對象' });

    try {
        if (await hasActiveInstantChat(targetUserId)) {
            return res.status(400).json({ success: false, error: '對方正在進行即時聊天，請稍後再邀請' });
        }

        const roomResult = await query(
            'INSERT INTO chat_rooms (type, is_temp, created_at) VALUES ("private", 1, NOW())'
        );
        const roomId = roomResult.insertId;

        await query(
            'INSERT INTO chat_room_members (room_id, user_id, joined_at) VALUES (?, ?, NOW()), (?, ?, NOW())',
            [roomId, fromUserId, roomId, targetUserId]
        );

        await query(
            'INSERT INTO instant_chat_invites (from_user_id, to_user_id, room_id, status, expires_at) VALUES (?, ?, ?, "pending", DATE_ADD(NOW(), INTERVAL 5 MINUTE))',
            [fromUserId, targetUserId, roomId]
        );

        // 發送推送通知
        await sendPushNotification(targetUserId, {
            title: '即時聊天邀請',
            body: `附近用戶邀請你進行即時聊天（限時1分鐘）`,
            data: { roomId, fromUserId, type: 'instant_chat_invite' }
        });

        // 發送 Socket 通知
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${targetUserId}`).emit('instant-chat-invite', {
                fromUserId,
                fromUsername: req.user.username,
                roomId,
                expiresIn: 60
            });
        }

        res.json({ success: true, message: '邀請已發送', roomId });
    } catch (error) {
        console.error('發送即時聊天邀請失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});


// 獲取當前用戶正在進行的即時聊天（最多一個）
router.get('/active', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    try {
        const rows = await query(
            `SELECT room_id FROM instant_chat_invites 
             WHERE (from_user_id = ? OR to_user_id = ?) 
             AND status = 'accepted' 
             AND expires_at > NOW() 
             LIMIT 1`,
            [userId, userId]
        );
        if (rows.length === 0) {
            return res.json({ success: true, hasActive: false });
        }
        const roomId = rows[0].room_id;
        // 獲取對方用戶ID
        const otherUser = await query(
            `SELECT from_user_id, to_user_id FROM instant_chat_invites WHERE room_id = ?`,
            [roomId]
        );
        const otherUserId = otherUser[0].from_user_id === userId ? otherUser[0].to_user_id : otherUser[0].from_user_id;
        res.json({ success: true, hasActive: true, roomId, otherUserId });
    } catch (error) {
        console.error('獲取進行中即時聊天失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});


// 接受邀請
router.post('/accept', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { roomId } = req.body;

    try {
        // 更新邀請狀態
        await query(
            'UPDATE instant_chat_invites SET status = "accepted", accepted_at = NOW() WHERE room_id = ? AND to_user_id = ?',
            [roomId, userId]
        );

        // 在 /accept 路由中
        await query(
            'UPDATE instant_chat_invites SET status = "accepted", accepted_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL 1 MINUTE) WHERE room_id = ? AND to_user_id = ?',
            [roomId, userId]
        );

        // 獲取發起人
        const invite = await query(
            'SELECT from_user_id FROM instant_chat_invites WHERE room_id = ?',
            [roomId]
        );
        const fromUserId = invite[0]?.from_user_id;

        const io = req.app.get('io');
        if (io && fromUserId) {
            io.to(`user_${fromUserId}`).emit('instant-chat-accepted', {
                roomId,
                withUserId: userId
            });
        }

        res.json({ success: true, roomId });
    } catch (error) {
        console.error('接受即時聊天失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// 拒絕邀請
router.post('/reject', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { roomId } = req.body;

    try {
        await query(
            'UPDATE instant_chat_invites SET status = "rejected", rejected_at = NOW() WHERE room_id = ? AND to_user_id = ?',
            [roomId, userId]
        );

        const invite = await query('SELECT from_user_id FROM instant_chat_invites WHERE room_id = ?', [roomId]);
        const fromUserId = invite[0]?.from_user_id;

        const io = req.app.get('io');
        if (io && fromUserId) {
            io.to(`user_${fromUserId}`).emit('instant-chat-rejected', { roomId });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('拒絕即時聊天失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});





// 檢查用戶是否有進行中的即時聊天
async function hasActiveInstantChat(userId) {
    const rows = await query(
        `SELECT id FROM instant_chat_invites 
         WHERE (from_user_id = ? OR to_user_id = ?) 
         AND status = 'accepted' 
         AND expires_at > NOW() 
         LIMIT 1`,
        [userId, userId]
    );
    return rows.length > 0;
}

module.exports = router;