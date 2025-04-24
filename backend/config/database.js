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

    this.pool = new Pool(config);

    // 測試連接
    this.testConnection();

    // 連線池事件監聽
    this.pool.on('error', (err) => {
      console.error('資料庫連線池錯誤:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
    });

    this.pool.on('connect', () => {
      console.log('新的資料庫連線已建立');
    });

    this.pool.on('acquire', () => {
      console.log('資料庫連線已從池中獲取');
    });

    this.pool.on('remove', () => {
      console.log('資料庫連線已從池中移除');
    });

    // 綁定方法到實例
    this.query = this.query.bind(this);
    this.transaction = this.transaction.bind(this);
    this.getClient = this.getClient.bind(this);
    this.getPoolStats = this.getPoolStats.bind(this);
    this.close = this.close.bind(this);
  }

  // 測試資料庫連接
  async testConnection() {
    try {
      const client = await this.pool.connect();
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
      // 不要立即結束程序，讓應用程序有機會重試
    }
  }

  // 執行查詢的方法
  async query(text, params, retryCount = 3) {
    const start = Date.now();
    
    try {
      console.log('執行查詢:', {
        query: text.substring(0, 200),
        params: params ? JSON.stringify(params).substring(0, 200) : 'none'
      });

      const result = await this.pool.query(text, params);
      
      const duration = Date.now() - start;
      console.log('查詢執行時間:', duration, 'ms');
      
      return result;
    } catch (error) {
      console.error('查詢執行失敗:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        query: text,
        params: params
      });
      
      if (retryCount > 0) {
        console.log(`重試查詢 (${retryCount} 次剩餘)`);
        return this.query(text, params, retryCount - 1);
      }
      
      throw error;
    }
  }

  // 事務處理
  async transaction(callback) {
    const client = await this.pool.connect();
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

  // 獲取客戶端
  async getClient() {
    return await this.pool.connect();
  }

  // 獲取連接池狀態
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  // 關閉連接池
  async close() {
    await this.pool.end();
  }
}

// 創建並導出單例實例
const db = new Database();

// 導出 query 方法
module.exports = {
  query: db.query.bind(db),
  transaction: db.transaction.bind(db),
  getClient: db.getClient.bind(db),
  getPoolStats: db.getPoolStats.bind(db),
  close: db.close.bind(db)
};