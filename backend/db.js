const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = {
  max: 20,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

if (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER) {
  poolConfig.host = process.env.DB_HOST;
  poolConfig.port = parseInt(process.env.DB_PORT || '5432', 10);
  poolConfig.database = process.env.DB_NAME;
  poolConfig.user = process.env.DB_USER;
  poolConfig.password = process.env.DB_PASSWORD;
  poolConfig.ssl = false;
} else {
  poolConfig.connectionString = process.env.DATABASE_URL;
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=require')) {
    poolConfig.ssl = false;
  } else {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

const pool = new Pool(poolConfig);

pool.on('connect', (client) => {
  client.query(`SET TIME ZONE 'Asia/Karachi'`).catch((err) => {
    console.error('Failed to set database time zone', err);
  });
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

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
