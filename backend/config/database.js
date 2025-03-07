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
      connectionTimeoutMillis: 2000, // 2秒內無法取得連線則拋出錯誤
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // 連線池事件監聽
    this.pool.on('error', (err) => {
      console.error('資料庫連線池異常', err);
    });
  }

  // 執行查詢
  async query(text, params) {
    return this.pool.query(text, params);
  }

  // 取得客戶端連線
  async getClient() {
    return this.pool.connect();
  }

  // 關閉連線池
  async close() {
    await this.pool.end();
  }
}

module.exports = new Database();