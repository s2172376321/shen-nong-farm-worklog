const db = require('../config/database');

const WorkLogController = {
  // 創建工作日誌
  async createWorkLog(req, res) {
    const { 
      location, 
      crop, 
      startTime, 
      endTime, 
      workCategories, 
      details, 
      harvestQuantity 
    } = req.body;

    try {
      const query = `
        INSERT INTO work_logs 
        (user_id, location, crop, start_time, end_time, work_categories, details, harvest_quantity)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;

      const values = [
        req.user.id,  // 從認證中間件取得使用者ID
        location,
        crop,
        startTime,
        endTime,
        workCategories,
        details,
        harvestQuantity
      ];

      const result = await db.query(query, values);
      
      res.status(201).json({
        message: '工作日誌創建成功',
        workLogId: result.rows[0].id
      });
    } catch (error) {
      console.error('創建工作日誌失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 查詢工作日誌
  async searchWorkLogs(req, res) {
    const { location, crop, startDate, endDate } = req.query;

    try {
      let query = `
        SELECT * FROM work_logs 
        WHERE user_id = $1
      `;
      const values = [req.user.id];
      let paramIndex = 2;

      if (location) {
        query += ` AND location ILIKE $${paramIndex}`;
        values.push(`%${location}%`);
        paramIndex++;
      }

      if (crop) {
        query += ` AND crop ILIKE $${paramIndex}`;
        values.push(`%${crop}%`);
        paramIndex++;
      }

      if (startDate && endDate) {
        query += ` AND created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        values.push(startDate, endDate);
      }

      query += ' ORDER BY created_at DESC';

      const result = await db.query(query, values);
      
      res.json(result.rows);
    } catch (error) {
      console.error('查詢工作日誌失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 管理員覆核工作日誌
  async reviewWorkLog(req, res) {
    const { workLogId } = req.params;
    const { status } = req.body;

    try {
      const query = `
        UPDATE work_logs 
        SET status = $1, 
            reviewed_at = CURRENT_TIMESTAMP, 
            reviewer_id = $2
        WHERE id = $3
      `;

      const values = [
        status, 
        req.user.id,  // 管理員ID
        workLogId
      ];

      await db.query(query, values);
      
      res.json({ message: '工作日誌覆核成功' });
    } catch (error) {
      console.error('覆核工作日誌失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  }
};

module.exports = WorkLogController;