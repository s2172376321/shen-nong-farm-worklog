const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'shen_nong_worklog',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    return;
  }
  console.log('Successfully connected to PostgreSQL database');
  release();
});

// 連線池事件監聽
pool.on('error', (err) => {
  console.error('資料庫連線池錯誤:', {
    message: err.message,
    code: err.code,
    stack: err.stack
  });
});

pool.on('connect', () => {
  console.log('新的資料庫連線已建立');
});

pool.on('acquire', () => {
  console.log('資料庫連線已從池中獲取');
});

pool.on('remove', () => {
  console.log('資料庫連線已從池中移除');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool
}; 