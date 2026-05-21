const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'login',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

// Verify connection on startup
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅  Database connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌  Database connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
