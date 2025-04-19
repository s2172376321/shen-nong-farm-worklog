const fs = require('fs');
const path = require('path');
const pool = require('./database');

async function initializeDatabase() {
  try {
    // 讀取 SQL 文件
    const sqlPath = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // 執行 SQL
    await pool.query(sql);
    console.log('數據庫表初始化成功');
  } catch (error) {
    console.error('初始化數據庫時出錯:', error);
    process.exit(1);
  }
}

// 執行初始化
initializeDatabase(); 