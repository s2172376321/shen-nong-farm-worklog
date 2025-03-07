// 位置：backend/models/User.js
class User {
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async create(username, email, passwordHash, role = 'user') {
    const query = `
      INSERT INTO users 
      (username, email, password_hash, role) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id
    `;
    const result = await db.query(query, [username, email, passwordHash, role]);
    return result.rows[0].id;
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