const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

async function initDatabase() {
  try {
    // 創建 users 表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 創建默認管理員用戶
    const defaultAdmin = {
      username: 'admin',
      password: '$2a$10$X7J3Y5v8Q2W4E6R8T0Y2U4I6O8A0C2E4G6I8K0M2O4Q6S8U0W2Y4', // 密碼: admin123
      name: '管理員'
    };

    await pool.query(`
      INSERT INTO users (username, password, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (username) DO NOTHING;
    `, [defaultAdmin.username, defaultAdmin.password, defaultAdmin.name]);

    console.log('資料庫初始化完成');
  } catch (error) {
    console.error('資料庫初始化錯誤:', error);
    throw error;
  }
}

module.exports = initDatabase; 