// 位置：backend/scripts/migrate-work-log-dates.js
const path = require('path');
const fs = require('fs');

// 手動加載 .env 檔案
const envPath = path.resolve(process.cwd(), '.env');
console.log('嘗試載入 .env 檔案:', envPath);
if (fs.existsSync(envPath)) {
  console.log('.env 檔案存在，正在載入...');
  require('dotenv').config({ path: envPath });
} else {
  console.error('警告: .env 檔案不存在!');
}

// 檢查環境變數是否已載入
if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_HOST || !process.env.DB_NAME) {
  console.log('環境變數未載入，使用預設配置...');
  // 設置預設配置
  process.env.DB_USER = 'postgres';
  process.env.DB_PASSWORD = '1qazXSW@';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'shen_nong_worklog';
  process.env.DB_PORT = '5432';
}
const { Pool } = require('pg');

// 連接資料庫前先輸出資料庫連接信息（不包含密碼）
console.log('嘗試連接資料庫:', {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  // 檢查密碼是否為字串
  passwordIsString: typeof process.env.DB_PASSWORD === 'string',
  passwordLength: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0
});

// 創建一個直接的資料庫連接池，避免使用全局配置
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD || '',  // 提供默認空字串以避免非字串錯誤
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // 增加連接嘗試次數和超時時間
  max: 1, // 只使用一個連接
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// 向控制台輸出測試查詢
async function testDatabaseConnection() {
  try {
    console.log('嘗試執行測試查詢...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('資料庫連接成功:', testResult.rows[0].now);
    return true;
  } catch (error) {
    console.error('資料庫連接測試失敗:', error.message);
    if (error.code) {
      console.error('錯誤代碼:', error.code);
    }
    return false;
  }
}

// 檢查 work_logs 表結構
async function checkTableStructure() {
  try {
    console.log('檢查 work_logs 表結構...');
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'work_logs'
    `);
    
    console.log('work_logs 表結構:');
    result.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
    // 檢查是否已有 start_date 和 end_date 欄位
    const hasStartDate = result.rows.some(col => col.column_name === 'start_date');
    const hasEndDate = result.rows.some(col => col.column_name === 'end_date');
    
    return { hasStartDate, hasEndDate };
  } catch (error) {
    console.error('檢查表結構失敗:', error.message);
    return { hasStartDate: false, hasEndDate: false };
  }
}

// 執行遷移腳本
async function migrateWorkLogDates() {
  try {
    // 先測試連接
    const connected = await testDatabaseConnection();
    if (!connected) {
      throw new Error('無法連接到資料庫');
    }
    
    // 檢查表結構
    const { hasStartDate, hasEndDate } = await checkTableStructure();
    
    // 如果需要，添加新的欄位
    if (!hasStartDate || !hasEndDate) {
      console.log('添加日期欄位...');
      
      // 添加 start_date 欄位
      if (!hasStartDate) {
        await pool.query(`
          ALTER TABLE work_logs 
          ADD COLUMN IF NOT EXISTS start_date DATE
        `);
        console.log('已添加 start_date 欄位');
      }
      
      // 添加 end_date 欄位
      if (!hasEndDate) {
        await pool.query(`
          ALTER TABLE work_logs 
          ADD COLUMN IF NOT EXISTS end_date DATE
        `);
        console.log('已添加 end_date 欄位');
      }
    } else {
      console.log('日期欄位已存在');
    }
    
    // 更新 start_date 欄位
    console.log('更新 start_date 欄位...');
    await pool.query(`
      UPDATE work_logs 
      SET start_date = COALESCE(created_at::date, NOW()::date)
      WHERE start_date IS NULL
    `);
    
    // 更新 end_date 欄位
    console.log('更新 end_date 欄位...');
    await pool.query(`
      UPDATE work_logs 
      SET end_date = COALESCE(created_at::date, NOW()::date)
      WHERE end_date IS NULL
    `);
    
    console.log('日期欄位遷移完成');
    
    // 添加索引以提高查詢性能
    console.log('添加日期索引...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_work_logs_start_date ON work_logs(start_date);
      CREATE INDEX IF NOT EXISTS idx_work_logs_end_date ON work_logs(end_date);
    `);
    
    console.log('遷移完成！');
  } catch (error) {
    console.error('遷移失敗:', error);
  } finally {
    // 關閉資料庫連接池
    await pool.end();
    console.log('資料庫連接池已關閉');
  }
}

// 執行遷移
migrateWorkLogDates();