const { pool } = require('../db');

async function resetDatabase() {
  const client = await pool.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO CURRENT_USER');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    console.log('Database schema reset complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase().catch(async (error) => {
  console.error('Failed to reset database', error);
  await pool.end();
  process.exit(1);
});
