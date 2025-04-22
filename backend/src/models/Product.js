const { Pool } = require('pg');

// 創建 PostgreSQL 連接池
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const Product = {
  // 獲取所有產品
  async getAll() {
    try {
      const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
      return result.rows;
    } catch (error) {
      console.error('獲取產品列表失敗:', error);
      throw error;
    }
  },

  // 根據 ID 獲取產品
  async getById(id) {
    try {
      const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('獲取產品失敗:', error);
      throw error;
    }
  },

  // 根據編號獲取產品
  async getByCode(code) {
    try {
      const result = await pool.query('SELECT * FROM products WHERE code = $1', [code]);
      return result.rows[0];
    } catch (error) {
      console.error('獲取產品失敗:', error);
      throw error;
    }
  },

  // 創建產品
  async create(product) {
    try {
      const { name, code, category, unit, description, price } = product;
      const result = await pool.query(
        `INSERT INTO products (name, code, category, unit, description, price)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, code, category, unit, description, price]
      );
      return result.rows[0];
    } catch (error) {
      console.error('創建產品失敗:', error);
      throw error;
    }
  },

  // 更新產品
  async update(id, updates) {
    try {
      const { name, code, category, unit, description, price } = updates;
      const result = await pool.query(
        `UPDATE products 
         SET name = $1, code = $2, category = $3, unit = $4, 
             description = $5, price = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [name, code, category, unit, description, price, id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('更新產品失敗:', error);
      throw error;
    }
  },

  // 刪除產品
  async delete(id) {
    try {
      const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('刪除產品失敗:', error);
      throw error;
    }
  },

  // 查找產品
  async find(query) {
    try {
      const conditions = [];
      const values = [];
      let paramCount = 1;

      Object.entries(query).forEach(([key, value]) => {
        conditions.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      });

      const queryString = `SELECT * FROM products WHERE ${conditions.join(' AND ')}`;
      const result = await pool.query(queryString, values);
      return result.rows;
    } catch (error) {
      console.error('查找產品失敗:', error);
      throw error;
    }
  }
};

module.exports = Product; 