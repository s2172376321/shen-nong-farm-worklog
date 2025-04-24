const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'shen_nong_farm',
  port: '5432',
  ssl: false
});

async function updateUsersTable() {
  const client = await pool.connect();
  try {
    // 開始事務
    await client.query('BEGIN');

    // 讀取 SQL 文件
    const sqlFile = path.join(__dirname, '../sql/recreate_users.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // 執行 SQL
    await client.query(sql);

    // 提交事務
    await client.query('COMMIT');
    console.log('用戶表更新成功');
  } catch (error) {
    // 回滾事務
    await client.query('ROLLBACK');
    console.error('更新用戶表失敗:', error);
  } finally {
    client.release();
    pool.end();
  }
}

updateUsersTable(); 