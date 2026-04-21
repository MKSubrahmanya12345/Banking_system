const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.register = async (req, res) => {
  const { firstName, lastName, email, password, phone, address, dob } = req.body;
  try {
    // Check if user exists
    const existing = await db.query('SELECT * FROM CUSTOMER WHERE email = $1 OR phone = $2', [email, phone]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User with email or phone already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO CUSTOMER (first_name, last_name, email, password_hash, phone, address, date_of_birth) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING customer_id, first_name, last_name, email`,
      [firstName, lastName, email, passwordHash, phone, address, dob]
    );

    res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM CUSTOMER WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.customer_id, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: user.customer_id, name: user.first_name, email: user.email, role: 'customer' } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
