// 位置：backend/scripts/check-db-schema.js
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// 創建日誌目錄
const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, `schema-check-${new Date().toISOString().split('T')[0]}.log`);

// 日誌輔助函數
async function logMessage(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
  
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(LOG_FILE, logEntry);
    console.log(message);
  } catch (error) {
    console.error('寫入日誌失敗:', error);
  }
}

// 創建數據庫連接池
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1qazXSW@',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shen_nong_worklog',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// 必需的列定義
const REQUIRED_COLUMNS = [
  {
    name: 'id',
    type: 'SERIAL PRIMARY KEY',
    description: '主鍵'
  },
  {
    name: 'user_id',
    type: 'INTEGER NOT NULL',
    description: '使用者ID',
    references: 'users(id)'
  },
  {
    name: 'location',
    type: 'VARCHAR(255)',
    description: '位置名稱'
  },
  {
    name: 'start_date',
    type: 'DATE',
    description: '工作開始日期'
  },
  {
    name: 'end_date',
    type: 'DATE',
    description: '工作結束日期'
  },
  {
    name: 'crop',
    type: 'VARCHAR(255)',
    description: '作物名稱'
  },
  {
    name: 'start_time',
    type: 'VARCHAR(10) NOT NULL',
    description: '開始時間'
  },
  {
    name: 'end_time',
    type: 'VARCHAR(10) NOT NULL',
    description: '結束時間'
  },
  {
    name: 'work_categories',
    type: 'TEXT[] DEFAULT \'{}\'',
    description: '工作類別'
  },
  {
    name: 'details',
    type: 'TEXT',
    description: '詳細說明'
  },
  {
    name: 'harvest_quantity',
    type: 'DECIMAL(10, 2) DEFAULT 0',
    description: '收穫數量'
  },
  {
    name: 'created_at',
    type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
    description: '建立時間'
  },
  {
    name: 'updated_at',
    type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
    description: '更新時間'
  },
  {
    name: 'status',
    type: 'VARCHAR(20) DEFAULT \'pending\'',
    description: '狀態'
  },
  {
    name: 'reviewer_id',
    type: 'INTEGER',
    description: '審核者ID',
    references: 'users(id)'
  },
  {
    name: 'reviewed_at',
    type: 'TIMESTAMP WITH TIME ZONE',
    description: '審核時間'
  },
  {
    name: 'location_code',
    type: 'VARCHAR(50)',
    description: '位置代碼'
  },
  {
    name: 'position_code',
    type: 'VARCHAR(50)',
    description: '職位代碼'
  },
  {
    name: 'position_name',
    type: 'VARCHAR(100)',
    description: '職位名稱'
  },
  {
    name: 'work_category_code',
    type: 'VARCHAR(50)',
    description: '工作類別代碼'
  },
  {
    name: 'work_category_name',
    type: 'VARCHAR(100)',
    description: '工作類別名稱'
  },
  {
    name: 'product_id',
    type: 'VARCHAR(50)',
    description: '產品ID'
  },
  {
    name: 'product_name',
    type: 'VARCHAR(100)',
    description: '產品名稱'
  },
  {
    name: 'product_quantity',
    type: 'DECIMAL(10, 2) DEFAULT 0',
    description: '產品數量'
  },
  {
    name: 'work_hours',
    type: 'DECIMAL(4, 2) DEFAULT 0',
    description: '工作時數'
  }
];

// 必需的索引定義
const REQUIRED_INDEXES = [
  {
    name: 'idx_work_logs_user_id',
    columns: ['user_id']
  },
  {
    name: 'idx_work_logs_status',
    columns: ['status']
  },
  {
    name: 'idx_work_logs_start_date',
    columns: ['start_date']
  },
  {
    name: 'idx_work_logs_end_date',
    columns: ['end_date']
  },
  {
    name: 'idx_work_logs_created_at',
    columns: ['created_at']
  },
  {
    name: 'idx_work_logs_location_code',
    columns: ['location_code']
  },
  {
    name: 'idx_work_logs_position_code',
    columns: ['position_code']
  },
  {
    name: 'idx_work_logs_work_category_code',
    columns: ['work_category_code']
  }
];

// 必需的觸發器定義
const REQUIRED_TRIGGERS = [
  {
    name: 'update_work_logs_updated_at',
    timing: 'BEFORE',
    event: 'UPDATE',
    table: 'work_logs',
    function: `
      CREATE OR REPLACE FUNCTION update_work_logs_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `
  }
];

// 主函數
async function checkAndUpdateSchema() {
  const client = await pool.connect();
  
  try {
    await logMessage('開始檢查資料庫架構...');
    
    // 開始交易
    await client.query('BEGIN');
    
    // 檢查表是否存在
    const tableExists = await checkTableExists(client, 'work_logs');
    if (!tableExists) {
      await logMessage('work_logs 表不存在，正在創建...', 'warn');
      await createWorkLogsTable(client);
    }
    
    // 檢查並添加缺少的列
    await checkAndAddColumns(client);
    
    // 檢查並創建缺少的索引
    await checkAndCreateIndexes(client);
    
    // 檢查並創建觸發器
    await checkAndCreateTriggers(client);
    
    // 提交交易
    await client.query('COMMIT');
    
    await logMessage('資料庫架構檢查完成');
  } catch (error) {
    // 回滾交易
    await client.query('ROLLBACK');
    await logMessage(`資料庫架構檢查失敗: ${error.message}`, 'error');
    throw error;
  } finally {
    // 釋放客戶端
    client.release();
    // 關閉連接池
    await pool.end();
  }
}

// 檢查表是否存在
async function checkTableExists(client, tableName) {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `;
  
  const result = await client.query(query, [tableName]);
  return result.rows[0].exists;
}

// 創建工作日誌表
async function createWorkLogsTable(client) {
  const columnsSQL = REQUIRED_COLUMNS.map(col => {
    let sql = `${col.name} ${col.type}`;
    if (col.references) {
      sql += ` REFERENCES ${col.references}`;
    }
    return sql;
  }).join(',\n    ');
  
  const query = `
    CREATE TABLE work_logs (
    ${columnsSQL}
    );
  `;
  
  await client.query(query);
  await logMessage('成功創建 work_logs 表');
}

// 檢查並添加缺少的列
async function checkAndAddColumns(client) {
  for (const column of REQUIRED_COLUMNS) {
    const exists = await checkColumnExists(client, 'work_logs', column.name);
    if (!exists) {
      await logMessage(`添加缺少的列: ${column.name} (${column.type})`, 'warn');
      await addColumn(client, 'work_logs', column.name, column.type);
    } else {
      await logMessage(`列已存在: ${column.name}`);
    }
  }
}

// 檢查列是否存在
async function checkColumnExists(client, tableName, columnName) {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
      AND column_name = $2
    );
  `;
  
  const result = await client.query(query, [tableName, columnName]);
  return result.rows[0].exists;
}

// 添加列
async function addColumn(client, tableName, columnName, columnType) {
  const query = `
    ALTER TABLE ${tableName}
    ADD COLUMN IF NOT EXISTS ${columnName} ${columnType};
  `;
  
  await client.query(query);
  await logMessage(`已添加列 ${columnName} 到表 ${tableName}`);
}

// 檢查並創建索引
async function checkAndCreateIndexes(client) {
  for (const index of REQUIRED_INDEXES) {
    const exists = await checkIndexExists(client, index.name);
    if (!exists) {
      await logMessage(`創建缺少的索引: ${index.name}`, 'warn');
      await createIndex(client, index);
    } else {
      await logMessage(`索引已存在: ${index.name}`);
    }
  }
}

// 檢查索引是否存在
async function checkIndexExists(client, indexName) {
  const query = `
    SELECT EXISTS (
      SELECT FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname = $1
    );
  `;
  
  const result = await client.query(query, [indexName]);
  return result.rows[0].exists;
}

// 創建索引
async function createIndex(client, index) {
  const query = `
    CREATE INDEX IF NOT EXISTS ${index.name}
    ON work_logs (${index.columns.join(', ')});
  `;
  
  await client.query(query);
  await logMessage(`已創建索引 ${index.name}`);
}

// 檢查並創建觸發器
async function checkAndCreateTriggers(client) {
  for (const trigger of REQUIRED_TRIGGERS) {
    const exists = await checkTriggerExists(client, trigger.name);
    if (!exists) {
      await logMessage(`創建缺少的觸發器: ${trigger.name}`, 'warn');
      await createTrigger(client, trigger);
    } else {
      await logMessage(`觸發器已存在: ${trigger.name}`);
    }
  }
}

// 檢查觸發器是否存在
async function checkTriggerExists(client, triggerName) {
  const query = `
    SELECT EXISTS (
      SELECT FROM pg_trigger 
      WHERE tgname = $1
    );
  `;
  
  const result = await client.query(query, [triggerName]);
  return result.rows[0].exists;
}

// 創建觸發器
async function createTrigger(client, trigger) {
  // 首先創建觸發器函數
  await client.query(trigger.function);
  
  // 然後創建觸發器
  const query = `
    CREATE TRIGGER ${trigger.name}
    ${trigger.timing} ${trigger.event} ON ${trigger.table}
    FOR EACH ROW
    EXECUTE FUNCTION ${trigger.name}();
  `;
  
  await client.query(query);
  await logMessage(`已創建觸發器 ${trigger.name}`);
}

// 添加錯誤處理
process.on('unhandledRejection', async (error) => {
  await logMessage(`未處理的Promise拒絕: ${error.stack}`, 'error');
  process.exit(1);
});

process.on('uncaughtException', async (error) => {
  await logMessage(`未捕獲的異常: ${error.stack}`, 'error');
  process.exit(1);
});

// 執行主函數
checkAndUpdateSchema().catch(async (error) => {
  await logMessage(`執行失敗: ${error.stack}`, 'error');
  process.exit(1);
});