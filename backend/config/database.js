// backend/config/database.js
const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
      max: 20, // 連線池最大連線數
      idleTimeoutMillis: 30000, // 連線閒置30秒後關閉
      connectionTimeoutMillis: 5000, // 增加到5秒，處理較慢的網絡環境
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // 連線池事件監聽
    this.pool.on('error', (err) => {
      console.error('資料庫連線池異常', err);
    });

    // 追蹤連線池狀態
    this.pool.on('connect', () => {
      console.log('DB 連線已建立');
    });

    this.pool.on('acquire', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('DB 連線已從池中獲取');
      }
    });

    this.pool.on('remove', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('DB 連線已從池中移除');
      }
    });

    // 記錄初始化成功
    console.log('資料庫連線池已初始化');
  }

  // 執行查詢，增加錯誤處理和重試機制
  async query(text, params, retryCount = 3) {
    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      
      // 記錄查詢時間（僅在非生產環境）
      if (process.env.NODE_ENV !== 'production') {
        const duration = Date.now() - start;
        console.log(`查詢執行時間: ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      // 檢查是否為連接問題，並且還有重試次數
      if ((error.code === 'ECONNREFUSED' || error.code === '08006' || error.code === '08001') && retryCount > 0) {
        console.warn(`資料庫連線失敗，${retryCount}秒後重試...`);
        
        // 等待一秒後重試
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return this.query(text, params, retryCount - 1);
      }
      
      // 其他錯誤，記錄詳細信息並拋出
      console.error('查詢執行錯誤:', {
        error: error.message,
        code: error.code,
        query: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        params: params ? JSON.stringify(params).substring(0, 200) : 'none'
      });
      
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