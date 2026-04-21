const express = require('express');
const { getAccounts, getAccountStatement, createAccount } = require('../controllers/account.controller');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', verifyToken, getAccounts);
router.post('/', verifyToken, createAccount);
router.get('/:id/statement', verifyToken, getAccountStatement);

module.exports = router;
