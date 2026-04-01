const { Pool } = require('pg');
require('dotenv').config();

// ============================================================================
// POSTGRESQL CONNECTION POOL
// Replaces: database.py Database class connection_pool logic
// ============================================================================

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,        // max connections in pool (was 20 in psycopg2)
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a query with parameters.
 * Replaces: db.get_cursor() context manager pattern.
 *
 * Usage:
 *   const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
 */
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (err) {
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Execute multiple queries inside a single transaction.
 * Replaces: the implicit transaction in psycopg2's get_cursor() context manager.
 *
 * Usage:
 *   await transaction(async (client) => {
 *     await client.query('INSERT INTO users ...');
 *     await client.query('INSERT INTO admins ...');
 *   });
 */
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { query, transaction, pool };
