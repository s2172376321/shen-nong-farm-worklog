const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('数据库连接成功！');
    
    // 测试查询
    const result = await client.query('SELECT NOW()');
    console.log('数据库时间:', result.rows[0].now);
    
    client.release();
  } catch (error) {
    console.error('数据库连接失败:', error);
  } finally {
    await pool.end();
  }
}

testConnection(); 