import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.NODE_ENV === 'production' ? process.env.DATABASE_URL_POOLED :process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error(JSON.stringify({
    level: 'error',
    message: 'Unexpected error on idle PostgreSQL client; the pool will replace it',
    error: {
      name: err.name,
      message: err.message,
      ...(err.code && { code: err.code })
    }
  }));
});

export const query = (text, params) => pool.query(text, params);

export default {
  query,
  pool
};
