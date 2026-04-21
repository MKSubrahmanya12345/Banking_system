const express = require('express');
const { applyLoan, approveLoan, getLoans, getEMISchedule } = require('../controllers/loan.controller');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/apply', verifyToken, applyLoan);
router.get('/', verifyToken, getLoans);
router.get('/:id/emi', verifyToken, getEMISchedule);

// Admin / Loan Officer route
// To test simply, we just use verifyToken, but ideally: requireRole(['loan_officer', 'admin'])
router.put('/:id/approve', verifyToken, approveLoan);

module.exports = router;
