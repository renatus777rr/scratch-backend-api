const pool = require('../db');

// Create a new user
async function createUser(user) {
  const query = `
    INSERT INTO users (
      username, password_hash, avatar, bio, status,
      profile_id, created_at, last_login
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8
    )
    RETURNING *;
  `;
  const values = [
    user.username,
    user.passwordHash,
    user.avatar,
    user.bio,
    user.status,
    user.profileId,
    user.createdAt || new Date(),
    user.lastLogin || null
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Get user by username
async function getUserByUsername(username) {
  const result = await pool.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );
  return result.rows[0];
}

// Export functions
module.exports = {
  createUser,
  getUserByUsername
};