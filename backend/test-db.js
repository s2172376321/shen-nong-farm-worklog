const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'shen_nong_worklog',
  password: process.env.DB_PASSWORD || '1qazXSW@',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

async function createUser() {
  let client;
  try {
    client = await pool.connect();
    console.log('資料庫連接成功！');
    
    // 生成密碼雜湊
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('5ji6gj94', salt);
    
    // 新增使用者
    const insertQuery = `
      INSERT INTO users (
        username,
        email,
        password_hash,
        role,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        '1224',
        'test1224@example.com',
        $1,
        'user',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) RETURNING *;
    `;
    
    const result = await client.query(insertQuery, [passwordHash]);
    console.log('新使用者已建立:', result.rows[0]);
    
  } catch (error) {
    console.error('資料庫操作失敗:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

async function updateUserRole() {
  let client;
  try {
    client = await pool.connect();
    console.log('資料庫連接成功！');
    
    // 更新使用者角色
    const updateQuery = `
      UPDATE users 
      SET role = 'admin'
      WHERE username = '1224'
      RETURNING *;
    `;
    
    const result = await client.query(updateQuery);
    console.log('使用者角色已更新:', result.rows[0]);
    
  } catch (error) {
    console.error('資料庫操作失敗:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

createUser();
updateUserRole(); 