// 位置：backend/config/database.js
// 優化數據庫連接配置

// backend/config/database.js
const { Pool } = require('pg');

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

    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
      max: 20, // 增加連接池大小
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

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

  // 取得客戶端連線
  async getClient() {
    return this.pool.connect();
  }

  // 取得連線池統計
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  // 關閉連線池
  async close() {
    console.log('關閉資料庫連線池...');
    await this.pool.end();
    console.log('資料庫連線池已關閉');
  }
}

const db = new Database();

// 應用程序關閉時關閉數據庫連接
process.on('SIGINT', async () => {
  console.log('應用程序關閉中...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('應用程序被終止...');
  await db.close();
  process.exit(0);
});

module.exports = db;