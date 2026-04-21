const db = require('../config/db');

exports.getAccounts = async (req, res) => {
  try {
    const customerId = req.user.id;
    const result = await db.query('SELECT * FROM ACCOUNT WHERE customer_id = $1', [customerId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAccountStatement = async (req, res) => {
  try {
    const { id } = req.params;
    // Basic authorization check - ideally check if account belongs to req.user.id or if admin
    
    // Using the vw_passbook view simplifies this
    const result = await db.query(
      'SELECT * FROM vw_passbook WHERE account_id = $1 ORDER BY txn_date DESC LIMIT 50', 
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createAccount = async (req, res) => {
  const { accountType } = req.body;
  const customerId = req.user.id;
  try {
    // Generate a random 10 digit account number
    const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    
    const result = await db.query(
      `INSERT INTO ACCOUNT (customer_id, account_number, account_type, balance) 
       VALUES ($1, $2, $3, 0.00) RETURNING *`,
      [customerId, accountNumber, accountType]
    );
    
    // Auto-issue a debit card for savings/current
    if (accountType !== 'fd') {
      const cardNumber = Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 5);
      
      await db.query(
        `INSERT INTO DEBIT_CARD (account_id, card_number, expiry_date) VALUES ($1, $2, $3)`,
        [result.rows[0].account_id, cardNumber, expiry]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
