// routes/tempChatRoutes.js
const express = require('express');
const router = express.Router();
const tempChatController = require('../controllers/tempChatController');
const authMiddleware = require('../middleware/auth');

router.post('/invite', authMiddleware(process.env.JWT_SECRET), tempChatController.sendInvite);
router.post('/accept', authMiddleware(process.env.JWT_SECRET), tempChatController.acceptInvite);
router.post('/reject', authMiddleware(process.env.JWT_SECRET), tempChatController.rejectInvite);
router.get('/pending', authMiddleware(process.env.JWT_SECRET), tempChatController.getPendingInvites);
router.get('/pending-accepted', authMiddleware(process.env.JWT_SECRET), tempChatController.getPendingAccepted);

module.exports = router;