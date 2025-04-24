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
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'shen_nong_worklog',
      password: process.env.DB_PASSWORD || '1qazXSW@',
      port: process.env.DB_PORT || 5432,
      max: 20,
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
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      console.log('資料庫連接成功！');
      client.release();
    } catch (error) {
      console.error('資料庫連接失敗:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('執行查詢:', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('查詢錯誤:', {
        text,
        params,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

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

  async getClient() {
    return await this.pool.connect();
  }
}

module.exports = new Database(); 