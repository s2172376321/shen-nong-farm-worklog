// 位置：backend/models/User.js
const db = require('../config/database');

class User {
  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await db.query(query, [email]);
      return result.rows[0];
    } catch (error) {
      console.error('查詢用戶失敗:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  static async findByUsername(username) {
    try {
      const query = 'SELECT * FROM users WHERE username = $1';
      const result = await db.query(query, [username]);
      return result.rows[0];
    } catch (error) {
      console.error('查詢用戶失敗:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  static async findByGoogleId(googleId) {
    try {
      const query = 'SELECT * FROM users WHERE google_id = $1';
      const result = await db.query(query, [googleId]);
      return result.rows[0];
    } catch (error) {
      console.error('查詢用戶失敗:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  static async create(username, email, passwordHash, role = 'user', name = null, department = null, position = null) {
    try {
      const query = `
        INSERT INTO users 
        (username, email, password_hash, role, name, department, position) 
        VALUES ($1, $2, $3, $4::enum_users_role, $5, $6, $7) 
        RETURNING id, username, email, role
      `;
      const result = await db.query(query, [username, email, passwordHash, role, name, department, position]);
      return result.rows[0];
    } catch (error) {
      console.error('創建用戶失敗:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  static async createGoogleUser({ username, email, googleId, profileImage, name }) {
    try {
      const query = `
        INSERT INTO users 
        (username, email, google_id, role, profile_image_url, name, google_email) 
        VALUES ($1, $2, $3, $4::enum_users_role, $5, $6, $7) 
        RETURNING id, username, email, role, name
      `;
      const result = await db.query(query, [
        username,
        email,
        googleId,
        'user',
        profileImage,
        name || null,
        email
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('創建 Google 用戶失敗:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  static async updateLastLogin(userId) {
    try {
      const query = `
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      await db.query(query, [userId]);
    } catch (error) {
      console.error('更新最後登入時間失敗:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = User;

// 位置：backend/models/WorkLog.js
class WorkLog {
  static async create(userId, workLogData) {
    const { 
      location, 
      crop, 
      startTime, 
      endTime, 
      workCategories, 
      details, 
      harvestQuantity 
    } = workLogData;

    const query = `
      INSERT INTO work_logs 
      (user_id, location, crop, start_time, end_time, work_categories, details, harvest_quantity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;

    const result = await db.query(query, [
      userId,
      location,
      crop,
      startTime,
      endTime,
      workCategories,
      details,
      harvestQuantity
    ]);

    return result.rows[0].id;
  }

  static async search(userId, filters) {
    let query = 'SELECT * FROM work_logs WHERE user_id = $1';
    const values = [userId];
    let paramIndex = 2;

    if (filters.location) {
      query += ` AND location ILIKE $${paramIndex}`;
      values.push(`%${filters.location}%`);
      paramIndex++;
    }

    if (filters.crop) {
      query += ` AND crop ILIKE $${paramIndex}`;
      values.push(`%${filters.crop}%`);
      paramIndex++;
    }

    if (filters.startDate && filters.endDate) {
      query += ` AND created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      values.push(filters.startDate, filters.endDate);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, values);
    return result.rows;
  }
}

module.exports = WorkLog;

// 位置：backend/models/Notice.js
class Notice {
  static async create(authorId, noticeData) {
    const { title, content, expiresAt } = noticeData;

    const query = `
      INSERT INTO notices 
      (title, content, author_id, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

    const result = await db.query(query, [
      title,
      content,
      authorId,
      expiresAt || null
    ]);

    return result.rows[0].id;
  }

  static async findAll() {
    const query = `
      SELECT n.*, u.username as author_name
      FROM notices n
      JOIN users u ON n.author_id = u.id
      WHERE (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY created_at DESC
    `;

    const result = await db.query(query);
    return result.rows;
  }
}

module.exports = Notice;