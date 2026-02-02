// routes/health.js
const express = require('express');
const router = express.Router();

module.exports = (connection, authMiddleware, JWT_SECRET, buildAvatarUrl, BASE_URL, postMediaUpload) => {

// ==================== 健康檢查 API ====================
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'LockMATCH API',
    version: '1.0.0'
  });
});


  return router;
};