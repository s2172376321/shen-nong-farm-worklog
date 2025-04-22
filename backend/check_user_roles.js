const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkUserRoles() {
  try {
    const result = await pool.query('SELECT username, role FROM users');
    console.log('用戶角色列表:');
    console.table(result.rows);
  } catch (error) {
    console.error('查詢失敗:', error);
  } finally {
    await pool.end();
  }
}

checkUserRoles(); 