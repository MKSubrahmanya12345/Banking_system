const express = require('express');
const { transferFunds, getTransactions, getFraudAlerts } = require('../controllers/transaction.controller');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/transfer', verifyToken, transferFunds);
router.get('/:accountId', verifyToken, getTransactions);
router.get('/fraud/alerts', verifyToken, getFraudAlerts);

module.exports = router;
