import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

// Load local environment variables from .env if it exists
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        value = value.replace(/(^['"]|['"]$)/g, '');
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (err) {
  console.error('Failed to load .env file:', err.message);
}

// Fallbacks support standard variable names, Railway's default keys, or local values
const dbHost = process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1';
const dbUser = process.env.DB_USER || process.env.MYSQLUSER || 'root';
const dbPassword = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'password';
const dbPort = Number.parseInt(process.env.DB_PORT || process.env.MYSQLPORT, 10) || 3306;
const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'pm_database';

// Establish the connection pool
const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: dbPort,
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.on('error', (err) => {
  console.error('Unexpected error on database pool:', err.message);
});

export default pool;
