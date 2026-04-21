const db = require('../config/db');

exports.applyLoan = async (req, res) => {
  const { loanType, principal, tenureMonths, accountId } = req.body;
  const customerId = req.user.id;
  
  // Set interest rate based on loan type for simplicity
  let interestRate = 12.0;
  if(loanType === 'home') interestRate = 8.5;
  if(loanType === 'education') interestRate = 9.0;
  
  try {
     const result = await db.query(
        `INSERT INTO LOAN (customer_id, account_id, loan_type, principal, interest_rate, tenure_months)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [customerId, accountId, loanType, principal, interestRate, tenureMonths]
     );
     res.status(201).json(result.rows[0]);
  } catch (error) {
     res.status(500).json({ error: error.message });
  }
};

exports.approveLoan = async (req, res) => {
  const { id } = req.params;
  try {
     // Check if user is loan officer/admin
     
     // 1. Update loan status
     await db.query(`UPDATE LOAN SET status = 'approved', start_date = CURRENT_DATE WHERE loan_id = $1`, [id]);
     
     // 2. Disburse principal into the customer's account
     const loanRes = await db.query(`SELECT account_id, principal FROM LOAN WHERE loan_id = $1`, [id]);
     const accountId = loanRes.rows[0].account_id;
     const principal = loanRes.rows[0].principal;
     
     await db.query(`UPDATE ACCOUNT SET balance = balance + $1 WHERE account_id = $2`, [principal, accountId]);
     
     // Log disbursement transaction
     await db.query(
       `INSERT INTO TRANSACTION (to_account_id, amount, txn_type, description, status) 
        VALUES ($1, $2, 'deposit', 'Loan Disbursement', 'success')`,
       [accountId, principal]
     );

     // 3. Trigger stored procedure to generate EMI schedule
     await db.query(`CALL sp_generate_emi_schedule($1)`, [id]);
     
     // 4. Set to active
     await db.query(`UPDATE LOAN SET status = 'active' WHERE loan_id = $1`, [id]);
     
     res.json({ message: 'Loan approved, disbursed, and EMI schedule generated' });
  } catch (error) {
     res.status(500).json({ error: error.message });
  }
};

exports.getLoans = async (req, res) => {
  const customerId = req.user.id;
  try {
     const result = await db.query(`SELECT * FROM vw_loan_summary WHERE customer_id = $1`, [customerId]);
     res.json(result.rows);
  } catch (error) {
     res.status(500).json({ error: error.message });
  }
};

exports.getEMISchedule = async (req, res) => {
  const { id } = req.params;
  try {
     const result = await db.query(`SELECT * FROM EMI_SCHEDULE WHERE loan_id = $1 ORDER BY due_date ASC`, [id]);
     res.json(result.rows);
  } catch (error) {
     res.status(500).json({ error: error.message });
  }
};
