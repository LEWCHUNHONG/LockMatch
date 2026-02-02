// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (JWT_SECRET) => (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: '需要授權 token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: '無效 token' });
  }
};