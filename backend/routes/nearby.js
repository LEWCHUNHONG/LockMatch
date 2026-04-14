// routes/nearby.js
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

// GET /api/nearby-users?lat=...&lng=...&radius=...
router.get('/', authMiddleware(process.env.JWT_SECRET), async (req, res) => {
    const userId = req.user.id;
    const { lat, lng, radius = 1000 } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ success: false, error: '缺少經緯度' });
    }

    try {
        const sql = `
      SELECT 
        u.id, 
        u.username, 
        u.avatar, 
        u.mbti,
        ul.latitude,
        ul.longitude,
        (6371 * 1000 * acos(
          cos(radians(?)) * cos(radians(ul.latitude)) *
          cos(radians(ul.longitude) - radians(?)) +
          sin(radians(?)) * sin(radians(ul.latitude))
        )) AS distance
      FROM user_locations ul
      JOIN users u ON ul.user_id = u.id
      WHERE ul.id IN (
        SELECT MAX(id) FROM user_locations GROUP BY user_id
      )
        AND ul.created_at >= NOW() - INTERVAL 10 MINUTE
      AND u.id != ?
      HAVING distance < ?
      ORDER BY distance
    `;

        const nearbyUsers = await query(sql, [lat, lng, lat, userId, radius]);

        res.json({
            success: true,
            users: nearbyUsers.map(u => ({
                id: u.id,
                username: u.username,
                avatar: u.avatar,
                mbti: u.mbti,
                latitude: u.latitude,
                longitude: u.longitude,
                distance: Math.round(u.distance),
            })),
        });
    } catch (error) {
        console.error('獲取附近用戶失敗:', error);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

module.exports = router;