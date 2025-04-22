const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 读取迁移文件
    const migrationPath = path.join(__dirname, '../../database/migrations/14_update_username_constraint.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // 执行迁移
    await client.query(migrationSQL);
    await client.query('COMMIT');
    console.log('迁移成功完成');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('迁移失败:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

runMigration().catch(console.error); 