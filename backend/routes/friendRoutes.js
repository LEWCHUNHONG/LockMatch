const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const authMiddleware = require('../middleware/auth');

router.post('/friend-request', authMiddleware(process.env.JWT_SECRET), friendController.sendFriendRequest);
router.post('/accept-friend-request', authMiddleware(process.env.JWT_SECRET), friendController.acceptFriendRequest);
router.post('/decline-friend-request', authMiddleware(process.env.JWT_SECRET), friendController.declineFriendRequest);
router.get('/pending-friend-requests', authMiddleware(process.env.JWT_SECRET), friendController.getPendingRequests);
router.post('/friend-request/accept-by-users', authMiddleware(process.env.JWT_SECRET), friendController.acceptByUsers);

module.exports = router;