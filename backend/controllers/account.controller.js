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
  const allowedTypes = ['savings', 'current', 'fd'];

  if (!allowedTypes.includes(accountType)) {
    return res.status(400).json({ error: 'Invalid account type' });
  }

  try {
    await db.query('BEGIN');

    // Keep SERIAL sequence in sync with existing data to avoid duplicate account_id errors.
    await db.query(
      `SELECT setval(
        pg_get_serial_sequence('account', 'account_id'),
        COALESCE((SELECT MAX(account_id) FROM ACCOUNT), 1),
        true
      )`
    );

    let createdAccount = null;
    for (let i = 0; i < 5; i += 1) {
      const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();

      try {
        const result = await db.query(
          `INSERT INTO ACCOUNT (customer_id, account_number, account_type, balance)
           VALUES ($1, $2, $3, 0.00)
           RETURNING account_id, account_number, account_type, balance, status, opened_at`,
          [customerId, accountNumber, accountType]
        );
        createdAccount = result.rows[0];
        break;
      } catch (insertErr) {
        if (insertErr.code !== '23505') {
          throw insertErr;
        }
      }
    }

    if (!createdAccount) {
      throw new Error('Could not generate a unique account number');
    }

    // Auto-issue a debit card for savings/current.
    if (accountType !== 'fd') {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 5);

      let cardCreated = false;
      for (let i = 0; i < 5; i += 1) {
        const cardNumber = Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();
        try {
          await db.query(
            `INSERT INTO DEBIT_CARD (account_id, card_number, expiry_date) VALUES ($1, $2, $3)`,
            [createdAccount.account_id, cardNumber, expiry]
          );
          cardCreated = true;
          break;
        } catch (cardErr) {
          if (cardErr.code !== '23505') {
            throw cardErr;
          }
        }
      }

      if (!cardCreated) {
        throw new Error('Could not generate a unique debit card number');
      }
    }

    await db.query('COMMIT');
    res.status(201).json(createdAccount);
  } catch (error) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
};
