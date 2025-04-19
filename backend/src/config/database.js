const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 測試資料庫連接
pool.connect()
  .then(client => {
    console.log('資料庫連接成功。');
    client.release();
  })
  .catch(err => {
    console.error('無法連接到資料庫:', err);
  });

module.exports = pool; 