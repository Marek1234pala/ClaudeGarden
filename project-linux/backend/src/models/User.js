const { pool } = require('../config/database');

/**
 * Find a user by email.
 * Returns the user row or null.
 */
async function findByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

/**
 * Find a user by ID.
 * Returns the user row (without password) or null.
 */
async function findById(id) {
  const [rows] = await pool.execute(
    'SELECT id, firstName, lastName, email, created_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

/**
 * Create a new user.
 * Returns the insertId of the new record.
 */
async function create({ firstName, lastName, email, password }) {
  const [result] = await pool.execute(
    'INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)',
    [firstName, lastName, email, password]
  );
  return result.insertId;
}

module.exports = { findByEmail, findById, create };
