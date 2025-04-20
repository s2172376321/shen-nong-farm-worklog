const bcrypt = require('bcryptjs');
const db = require('../config/database');

class User {
  static async findByEmail(email) {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  static async findByGoogleId(googleId) {
    const result = await db.query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findOne(options) {
    const { where } = options;
    const conditions = [];
    const values = [];
    let counter = 1;

    Object.entries(where).forEach(([key, value]) => {
      conditions.push(`${this.toSnakeCase(key)} = $${counter}`);
      values.push(value);
      counter++;
    });

    const query = `
      SELECT * FROM users 
      WHERE ${conditions.join(' AND ')}
      LIMIT 1
    `;

    const result = await db.query(query, values);
    const user = result.rows[0];
    
    if (user) {
      // 添加 comparePassword 方法到用戶對象
      user.comparePassword = async (candidatePassword) => {
        return await bcrypt.compare(candidatePassword, user.password_hash);
      };
    }
    
    return user;
  }

  static async create(userData) {
    const {
      username,
      email,
      password,
      googleId,
      name,
      role = 'user',
      profileImageUrl
    } = userData;

    let passwordHash = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const result = await db.query(
      `INSERT INTO users 
      (username, email, password_hash, google_id, name, role, profile_image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [username, email, passwordHash, googleId, name, role, profileImageUrl]
    );

    return result.rows[0];
  }

  static async update(id, updateData) {
    const updates = [];
    const values = [];
    let counter = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updates.push(`${this.toSnakeCase(key)} = $${counter}`);
        values.push(updateData[key]);
        counter++;
      }
    });

    if (updates.length === 0) return null;

    values.push(id);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${counter}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // 輔助方法：將駝峰命名轉換為蛇形命名
  static toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

module.exports = User; 