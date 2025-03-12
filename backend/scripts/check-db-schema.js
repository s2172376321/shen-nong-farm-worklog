// 位置：backend/scripts/check-db-schema.js
// 這個腳本會檢查工作日誌表的架構，並添加任何缺少的欄位

require('dotenv').config();
const { Pool } = require('pg');

// 創建數據庫連接池
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1qazXSW@', 
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shen_nong_worklog'
});

// 主函數
async function checkAndUpdateSchema() {
  console.log('開始檢查資料庫架構...');
  
  try {
    // 檢查 work_logs 表是否存在
    const tableExists = await checkTableExists('work_logs');
    if (!tableExists) {
      console.log('work_logs 表不存在，正在創建...');
      await createWorkLogsTable();
    }
    
    // 檢查並添加可能缺少的欄位
    await checkAndAddColumns();
    
    console.log('資料庫架構檢查完成');
  } catch (error) {
    console.error('資料庫架構檢查失敗:', error);
  } finally {
    // 關閉連接池
    pool.end();
  }
}

// 檢查表是否存在
async function checkTableExists(tableName) {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `;
  
  const result = await pool.query(query, [tableName]);
  return result.rows[0].exists;
}

// 創建 work_logs 表
async function createWorkLogsTable() {
  const query = `
    CREATE TABLE work_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      location VARCHAR(255),
      crop VARCHAR(255),
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      work_categories TEXT[] DEFAULT '{}',
      details TEXT,
      harvest_quantity DECIMAL(10, 2) DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20) DEFAULT 'pending',
      reviewer_id INTEGER,
      reviewed_at TIMESTAMP WITH TIME ZONE,
      
      -- 新增欄位
      location_code VARCHAR(50),
      position_code VARCHAR(50),
      position_name VARCHAR(100),
      work_category_code VARCHAR(50),
      work_category_name VARCHAR(100),
      product_id VARCHAR(50),
      product_name VARCHAR(100),
      product_quantity DECIMAL(10, 2) DEFAULT 0
    );
  `;
  
  await pool.query(query);
  console.log('成功創建 work_logs 表');
}

// 檢查並添加缺少的欄位
async function checkAndAddColumns() {
  // 要檢查的欄位及其資料類型
  const columnsToCheck = [
    { name: 'location_code', type: 'VARCHAR(50)' },
    { name: 'position_code', type: 'VARCHAR(50)' },
    { name: 'position_name', type: 'VARCHAR(100)' },
    { name: 'work_category_code', type: 'VARCHAR(50)' },
    { name: 'work_category_name', type: 'VARCHAR(100)' },
    { name: 'product_id', type: 'VARCHAR(50)' },
    { name: 'product_name', type: 'VARCHAR(100)' },
    { name: 'product_quantity', type: 'DECIMAL(10, 2) DEFAULT 0' }
  ];
  
  for (const column of columnsToCheck) {
    const exists = await checkColumnExists('work_logs', column.name);
    if (!exists) {
      console.log(`添加缺少的欄位: ${column.name} (${column.type})`);
      await addColumn('work_logs', column.name, column.type);
    } else {
      console.log(`欄位已存在: ${column.name}`);
    }
  }
}

// 檢查欄位是否存在
async function checkColumnExists(tableName, columnName) {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
      AND column_name = $2
    );
  `;
  
  const result = await pool.query(query, [tableName, columnName]);
  return result.rows[0].exists;
}

// 添加欄位
async function addColumn(tableName, columnName, columnType) {
  const query = `
    ALTER TABLE ${tableName}
    ADD COLUMN IF NOT EXISTS ${columnName} ${columnType};
  `;
  
  await pool.query(query);
  console.log(`已添加欄位 ${columnName} 到表 ${tableName}`);
}

// 執行主函數
checkAndUpdateSchema();