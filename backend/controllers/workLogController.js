// 位置：backend/controllers/workLogController.js
const db = require('../config/database');
const csvUtils = require('../utils/csvUtils');

// 查詢今日工作時數 - 修正LENGTH函數問題
async function queryTodayWorkHours(userId, isAdmin) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayStr = today.toISOString();
  const tomorrowStr = tomorrow.toISOString();

  let query = `
    SELECT 
      SUM(
        CASE 
          WHEN 
            start_time IS NOT NULL AND 
            end_time IS NOT NULL 
          THEN 
            (
              (CAST(SUBSTRING(end_time::text FROM 1 FOR 2) AS INTEGER) - 
               CAST(SUBSTRING(start_time::text FROM 1 FOR 2) AS INTEGER)) +
              (CAST(SUBSTRING(end_time::text FROM 4 FOR 2) AS NUMERIC) - 
               CAST(SUBSTRING(start_time::text FROM 4 FOR 2) AS NUMERIC)) / 60.0
            )
          ELSE 0 
        END
      ) as total_hours
    FROM work_logs
    WHERE 
      created_at >= $1 AND 
      created_at < $2 AND
      start_time IS NOT NULL AND 
      end_time IS NOT NULL
  `;

  const values = [todayStr, tomorrowStr];

  if (!isAdmin) {
    query += ` AND user_id = $3`;
    values.push(userId);
  }

  const result = await db.query(query, values);
  const totalHours = result.rows.length > 0 ? 
    Math.min(parseFloat(result.rows[0].total_hours || 0), 8).toFixed(2) : 
    '0.00';

  return totalHours;
}

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
    const { location, crop, startDate, endDate, format } = req.query;

    try {
      let query = `
        SELECT wl.*, u.username 
        FROM work_logs wl
        JOIN users u ON wl.user_id = u.id
        WHERE 1=1
      `;
      const values = [];
      let paramIndex = 1;

      // 如果不是管理員，只能查看自己的工作日誌
      if (req.user.role !== 'admin') {
        query += ` AND wl.user_id = $${paramIndex}`;
        values.push(req.user.id);
        paramIndex++;
      }

      if (location) {
        query += ` AND wl.location ILIKE $${paramIndex}`;
        values.push(`%${location}%`);
        paramIndex++;
      }

      if (crop) {
        query += ` AND wl.crop ILIKE $${paramIndex}`;
        values.push(`%${crop}%`);
        paramIndex++;
      }

      if (startDate && endDate) {
        query += ` AND wl.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        values.push(startDate, endDate);
        paramIndex += 2;
      }

      query += ' ORDER BY wl.created_at DESC';

      const result = await db.query(query, values);
      
      // 如果請求 CSV 格式
      if (format === 'csv') {
        const headers = ['id', 'username', 'location', 'crop', 'start_time', 'end_time', 
                        'work_categories', 'details', 'harvest_quantity', 'status', 'created_at'];
        
        // 處理資料為 CSV 格式
        const csvData = result.rows.map(row => ({
          id: row.id,
          username: row.username,
          location: row.location,
          crop: row.crop,
          start_time: row.start_time,
          end_time: row.end_time,
          work_categories: Array.isArray(row.work_categories) ? row.work_categories.join('; ') : row.work_categories,
          details: row.details,
          harvest_quantity: row.harvest_quantity,
          status: row.status,
          created_at: csvUtils.formatDate(row.created_at)
        }));
        
        const csv = csvUtils.convertToCSV(csvData, headers);
        
        // 設置 CSV 標頭
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="work_logs.csv"');
        return res.send(csv);
      }
      
      // 否則返回 JSON
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
  },
  
  // 匯出工作日誌
  async exportWorkLogs(req, res) {
    const { startDate, endDate, format = 'csv' } = req.query;

    try {
      const searchParams = {
        startDate,
        endDate,
        format: 'csv'
      };

      if (req.user.role !== 'admin') {
        searchParams.userId = req.user.id;
      }

      const result = await WorkLogController.searchWorkLogs(searchParams);
      const csv = result.data;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="work_logs.csv"');
      res.send(csv);
    } catch (error) {
      console.error('匯出工作日誌失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  async getTodayHour(req, res) {
    try {
      const totalHours = await queryTodayWorkHours(req.user.id, req.user.role === 'admin');
      
      const responseData = {
        total_hours: totalHours,
        remaining_hours: (8 - parseFloat(totalHours)).toFixed(2),
        is_complete: parseFloat(totalHours) >= 8
      };

      res.json(responseData);
    } catch (error) {
      console.error('獲取今日工時失敗:', error);
      res.status(500).json({ 
        message: '伺服器錯誤，請稍後再試',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  }
};

module.exports = WorkLogController;