const db = require('../config/db');

exports.transferFunds = async (req, res) => {
  const { fromAccount, toAccount, amount, txnType, description } = req.body;
  // In a real app we'd verify the idempotency key here to prevent duplicate transfers

  try {
    // 1. Verify ownership of fromAccount OR teller role
    if (req.user.role === 'customer') {
      const ownerCheck = await db.query('SELECT customer_id FROM ACCOUNT WHERE account_number = $1', [fromAccount]);
      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].customer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized for this account' });
      }
    }

    // 2. Fetch Account IDs (since UI likely sends account numbers)
    const fromIdRes = await db.query('SELECT account_id, balance FROM ACCOUNT WHERE account_number = $1', [fromAccount]);
    const toIdRes = await db.query('SELECT account_id FROM ACCOUNT WHERE account_number = $1', [toAccount]);

    if (fromIdRes.rows.length === 0) return res.status(400).json({ error: 'Source account not found' });
    if (toIdRes.rows.length === 0) return res.status(400).json({ error: 'Destination account not found' });

    if (fromIdRes.rows[0].balance < amount) {
       return res.status(400).json({ error: 'Insufficient funds' });
    }

    const fromAccountId = fromIdRes.rows[0].account_id;
    const toAccountId = toIdRes.rows[0].account_id;

    // 3. Call the Stored Procedure utilizing database transaction
    // 'CALL' is used in pg 11+ for stored procedures
    const spQuery = `CALL sp_fund_transfer($1, $2, $3, $4, $5, null, null)`;
    
    // Note: Due to limitations in pg driver with OUT params in CALL, an alternative is direct SQL
    // Let's use direct SQL here to demonstrate ACID, the triggers will handle the balances.
    
    await db.query('BEGIN');
    
    // Insert into transaction - triggers will handle balance updates and fraud checking
    const txnRes = await db.query(
      `INSERT INTO TRANSACTION (from_account_id, to_account_id, amount, txn_type, description) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [fromAccountId, toAccountId, amount, txnType, description]
    );

    await db.query('COMMIT');
    
    res.json({ message: 'Transfer successful', transaction: txnRes.rows[0] });

  } catch (error) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: error.message || 'Transfer failed' });
  }
};

exports.getTransactions = async (req, res) => {
  const { accountId } = req.params;
  try {
     const result = await db.query(`SELECT * FROM TRANSACTION WHERE from_account_id = $1 OR to_account_id = $1 ORDER BY txn_date DESC`, [accountId]);
     res.json(result.rows);
  } catch (error) {
     res.status(500).json({ error: error.message });
  }
};

exports.getFraudAlerts = async (req, res) => {
   try {
      const result = await db.query(`SELECT * FROM vw_active_fraud_alerts`);
      res.json(result.rows);
   } catch(error) {
      res.status(500).json({ error: error.message });
   }
};
