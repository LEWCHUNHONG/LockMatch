// routes/groupInviteRoutes.js
const express = require('express');
const router = express.Router();
const groupInviteController = require('../controllers/groupInviteController');
const authMiddleware = require('../middleware/auth');

router.post('/group-invite', authMiddleware(process.env.JWT_SECRET), groupInviteController.sendGroupInvite);
router.post('/accept-group-invite', authMiddleware(process.env.JWT_SECRET), groupInviteController.acceptGroupInvite);
router.post('/reject-group-invite', authMiddleware(process.env.JWT_SECRET), groupInviteController.rejectGroupInvite);
router.get('/pending-group-invites', authMiddleware(process.env.JWT_SECRET), groupInviteController.getPendingGroupInvites);

module.exports = router;