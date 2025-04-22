const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'shen_nong_worklog',
  password: '1qazXSW@',
  port: 5432,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('數據庫連接成功！');
    
    // 測試查詢
    const result = await client.query('SELECT NOW()');
    console.log('數據庫時間:', result.rows[0].now);
    
    client.release();
  } catch (error) {
    console.error('數據庫連接失敗:', error);
  } finally {
    await pool.end();
  }
}

testConnection(); 