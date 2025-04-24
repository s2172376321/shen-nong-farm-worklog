const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function migrateUsers() {
  try {
    // 添加 is_active 欄位
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `);
    console.log('已添加 is_active 欄位');

    // 添加 last_login 欄位
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
    `);
    console.log('已添加 last_login 欄位');

    // 添加 department 欄位
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS department VARCHAR(100);
    `);
    console.log('已添加 department 欄位');

    // 添加 position 欄位
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS position VARCHAR(100);
    `);
    console.log('已添加 position 欄位');

    // 更新現有用戶的預設值
    await pool.query(`
      UPDATE users
      SET 
        is_active = TRUE,
        department = COALESCE(department, '未設定'),
        position = COALESCE(position, '未設定')
      WHERE id IS NOT NULL;
    `);
    console.log('已更新現有用戶的預設值');

    console.log('遷移完成');
  } catch (error) {
    console.error('遷移過程中發生錯誤:', error);
  } finally {
    await pool.end();
  }
}

migrateUsers(); 