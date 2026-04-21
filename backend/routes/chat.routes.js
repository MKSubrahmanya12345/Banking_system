const express = require('express');
const { chat } = require('../controllers/chat.controller');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', verifyToken, chat);

module.exports = router;
