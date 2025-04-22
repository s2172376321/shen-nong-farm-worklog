// 位置：backend/config/database.js
// 優化數據庫連接配置

// backend/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

// 檢查必要的環境變量
const requiredEnvVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('缺少必要的環境變量:', missingEnvVars);
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

class Database {
  constructor() {
    this._pool = null;
    this._isClosing = false;
    this.init();
  }

  init() {
    if (this._pool) {
      return;
    }

    // 輸出環境變數值（不包含密碼）
    console.log('Database Configuration:', {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 5432,
      ssl: process.env.NODE_ENV === 'production'
    });

    const config = {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
      max: 20, // 增加連接池大小
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };

    this._pool = new Pool(config);

    // 測試連接
    this.testConnection();

    // 連線池事件監聽
    this._pool.on('error', (err) => {
      console.error('資料庫連線池錯誤:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
    });

    this._pool.on('connect', () => {
      console.log('新的資料庫連線已建立');
    });

    this._pool.on('acquire', () => {
      console.log('資料庫連線已從池中獲取');
    });

    this._pool.on('remove', () => {
      console.log('資料庫連線已從池中移除');
    });
  }

  // 測試資料庫連接
  async testConnection() {
    try {
      const client = await this._pool.connect();
      console.log('資料庫連接測試成功');
      
      // 測試查詢
      const result = await client.query('SELECT NOW()');
      console.log('資料庫時間:', result.rows[0].now);
      
      client.release();
    } catch (error) {
      console.error('資料庫連接測試失敗:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
    }
  }

  // 執行查詢的方法
  async query(text, params, retryCount = 3) {
    if (this._isClosing) {
      throw new Error('Database is shutting down');
    }

    // 如果連接池不存在，重新初始化
    if (!this._pool) {
      this.init();
    }

    const start = Date.now();
    
    try {
      console.log('執行查詢:', {
        query: text.substring(0, 200),
        params: params ? JSON.stringify(params).substring(0, 200) : 'none'
      });

      const result = await this._pool.query(text, params);
      
      const duration = Date.now() - start;
      console.log(`查詢完成: ${duration}ms, 影響的行數: ${result.rowCount}`);
      
      return result;
    } catch (error) {
      console.error('查詢執行錯誤:', {
        error: error.message,
        code: error.code,
        query: text.substring(0, 200),
        params: params ? JSON.stringify(params).substring(0, 200) : 'none',
        duration: Date.now() - start
      });

      if (retryCount > 0 && 
          (error.code === 'ECONNREFUSED' || 
           error.code === '08006' || 
           error.code === '08001' || 
           error.code === '57014' || 
           error.code === '57P01')) {
        
        console.log(`嘗試重新連接... 剩餘重試次數: ${retryCount - 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.query(text, params, retryCount - 1);
      }

      throw error;
    }
  }

  // 使用事務
  async transaction(callback) {
    if (this._isClosing) {
      throw new Error('Database is shutting down');
    }

    const client = await this._pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 取得連線池統計
  getPoolStats() {
    if (!this._pool) {
      return { totalCount: 0, idleCount: 0, waitingCount: 0 };
    }
    return {
      totalCount: this._pool.totalCount,
      idleCount: this._pool.idleCount,
      waitingCount: this._pool.waitingCount
    };
  }

  // 關閉連線池
  async close() {
    if (this._isClosing || !this._pool) {
      return;
    }

    this._isClosing = true;
    console.log('正在等待現有查詢完成...');

    // 等待一段時間讓現有查詢完成
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('關閉資料庫連線池...');
    await this._pool.end();
    this._pool = null;
    this._isClosing = false;
    console.log('資料庫連線池已關閉');
  }
}

const db = new Database();

// 應用程序關閉時關閉數據庫連接
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`收到 ${signal} 信號，開始優雅關閉...`);
  
  try {
    await db.close();
    console.log('應用程序正常關閉');
    process.exit(0);
  } catch (error) {
    console.error('關閉過程中發生錯誤:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  console.error('未捕獲的異常:', error);
  gracefulShutdown('uncaughtException');
});

module.exports = db;