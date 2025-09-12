// db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = pool;