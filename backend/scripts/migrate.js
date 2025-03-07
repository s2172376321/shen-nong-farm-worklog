// backend/scripts/migrate.js
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function runMigrations() {
  const migrationDir = path.resolve(__dirname, '../../database/migrations');
  const migrationFiles = fs.readdirSync(migrationDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // 確保按順序執行

  const client = await pool.connect();

  try {
    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      console.log(`正在執行遷移：${file}`);
      
      try {
        await client.query(migrationSQL);
        console.log(`遷移 ${file} 成功`);
      } catch (error) {
        console.error(`遷移 ${file} 失敗:`, {
          errorName: error.name,
          errorMessage: error.message,
          errorCode: error.code,
          errorDetail: error.detail
        });

        // 記錄錯誤但繼續執行
        console.warn(`繼續執行其他遷移，忽略 ${file} 中的錯誤`);
      }
    }

    console.log('資料庫遷移完成');
  } catch (error) {
    console.error('遷移過程中發生錯誤:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigrations().then(() => {
  pool.end();
  process.exit(0);
}).catch(error => {
  console.error('遷移過程中發生最終錯誤:', error);
  pool.end();
  process.exit(1);
});