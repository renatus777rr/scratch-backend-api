const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db'); // PostgreSQL connection

// POST /accounts/login/
router.post('/login/', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Fetch user by username
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Compare password hash
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Update last login timestamp
    await pool.query(
      'UPDATE users SET last_login = $1 WHERE id = $2',
      [new Date(), user.id]
    );

    res.json({ message: 'Login successful', username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.get('/checkusername/:username', async (req, res) => {
  const username = (req.params.username || '').trim();

  if (!username) {
    return res.json({
      username,
      msg: 'invalid username',
      success: false
    });
  }

  try {
    const result = await pool.query(
      'SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
      [username]
    );

    if (result.rows.length > 0) {
      return res.json({
        username,
        msg: 'username exists',
        success: false
      });
    }

    // Force allow
    res.json({
      username,
      msg: 'username available',
      success: true
    });
  } catch (err) {
    console.error('❌ Error checking username:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Always say password is OK
router.post('/checkpassword', (req, res) => {
  const { password } = req.body;
  res.json({
    msg: 'password ok',
    success: true
  });
});

module.exports = router;

module.exports = router;