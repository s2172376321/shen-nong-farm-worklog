const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'shen_nong_farm',
  password: '1qazXSW@',
  port: 5432,
});

async function checkConnection() {
  try {
    console.log('嘗試連接到資料庫...');
    const client = await pool.connect();
    console.log('資料庫連接成功！');
    
    // 檢查資料庫版本
    const result = await client.query('SELECT version()');
    console.log('PostgreSQL 版本:', result.rows[0].version);
    
    // 檢查資料庫列表
    const dbs = await client.query('SELECT datname FROM pg_database');
    console.log('\n可用的資料庫:');
    console.table(dbs.rows);
    
    client.release();
  } catch (error) {
    console.error('連接資料庫時發生錯誤:', error);
  } finally {
    await pool.end();
  }
}

checkConnection(); 