// routes/location.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const connection = require('../db/connection');

// 輔助函數：將 query 包裝成 Promise
const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

// POST /api/user/location
router.post('/', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { latitude, longitude, accuracy } = req.body;

    if (!latitude || !longitude) {
        return res.status(400).json({ success: false, error: '缺少經緯度' });
    }

    try {
        // 1. 儲存位置記錄
        await query(
            'INSERT INTO user_locations (user_id, latitude, longitude, accuracy, created_at) VALUES (?, ?, ?, ?, NOW())',
            [userId, latitude, longitude, accuracy || null]
        );

        // 2. 獎勵積分（每次打卡加 50）
        const pointsReward = 5;
        await query('UPDATE users SET points = points + ? WHERE id = ?', [pointsReward, userId]);

        // 3. 記錄積分明細（使用 task_reward 類型，兼容現有表結構）
        await query(
            'INSERT INTO points_history (user_id, points, type, description) VALUES (?, ?, "task_reward", ?)',
            [userId, pointsReward, `即時打卡獎勵 +${pointsReward} 積分`]
        );

        res.json({
            success: true,
            message: '位置已儲存，獲得 5 積分',
            pointsEarned: pointsReward
        });
    } catch (error) {
        console.error('儲存位置失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

module.exports = router;