const { spawnSync } = require('child_process');
const path = require('path');
require('dotenv').config();

function getMigrationEnv() {
  const env = { ...process.env };

  if (!env.PGHOST && env.DB_HOST) env.PGHOST = env.DB_HOST;
  if (!env.PGPORT && env.DB_PORT) env.PGPORT = env.DB_PORT;
  if (!env.PGDATABASE && env.DB_NAME) env.PGDATABASE = env.DB_NAME;
  if (!env.PGUSER && env.DB_USER) env.PGUSER = env.DB_USER;
  if (!env.PGPASSWORD && env.DB_PASSWORD) env.PGPASSWORD = env.DB_PASSWORD;

  return env;
}

const cliPath = require.resolve('node-pg-migrate/bin/node-pg-migrate');
const args = process.argv.slice(2);
const migrationDir = path.join(__dirname, '..', 'migrations');
const result = spawnSync(process.execPath, [cliPath, ...args, '-m', migrationDir], {
  stdio: 'inherit',
  env: getMigrationEnv(),
});

process.exit(result.status === null ? 1 : result.status);
