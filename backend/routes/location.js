// routes/location.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const connection = require('../db/connection');


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

        res.json({
            success: true,
            message: '位置已儲存',  
        });
    } catch (error) {
        console.error('儲存位置失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

module.exports = router;