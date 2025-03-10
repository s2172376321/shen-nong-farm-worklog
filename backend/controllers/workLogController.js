// 位置：backend/controllers/workLogController.js
const db = require('../config/database');

const WorkLogController = {
  // 創建工作日誌
  async createWorkLog(req, res) {
    const { 
      location_code, 
      position_code, 
      position_name,
      work_category_code, 
      work_category_name,
      start_time, 
      end_time, 
      details, 
      harvest_quantity = 0,
      product_id = null,
      product_name = null,
      product_quantity = 0
    } = req.body;

    try {
      const query = `
        INSERT INTO work_logs 
        (user_id, location_code, position_code, position_name, 
        work_category_code, work_category_name, start_time, end_time, 
        details, harvest_quantity, product_id, product_name, product_quantity)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `;

      const values = [
        req.user.id,  // 從認證中間件取得使用者ID
        location_code,
        position_code,
        position_name,
        work_category_code,
        work_category_name,
        start_time,
        end_time,
        details,
        harvest_quantity,
        product_id,
        product_name,
        product_quantity
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

  // 查詢工作日誌 - 更新以支援更多篩選條件
  async searchWorkLogs(req, res) {
    const { startDate, endDate, location_code, work_category_code } = req.query;

    try {
      let query = `
        SELECT * FROM work_logs 
        WHERE user_id = $1
      `;
      const values = [req.user.id];
      let paramIndex = 2;

      if (location_code) {
        query += ` AND location_code = $${paramIndex}`;
        values.push(location_code);
        paramIndex++;
      }

      if (work_category_code) {
        query += ` AND work_category_code = $${paramIndex}`;
        values.push(work_category_code);
        paramIndex++;
      }

      if (startDate && endDate) {
        // 如果有提供日期範圍，則使用日期篩選
        query += ` AND DATE(created_at) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
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
  },

  // 取得今日工作總時數
  async getTodayTotalHours(req, res) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const query = `
        SELECT start_time, end_time
        FROM work_logs
        WHERE user_id = $1 AND DATE(created_at) = $2
      `;
      
      const values = [req.user.id, today];
      
      const result = await db.query(query, values);
      
      // 計算總工作時數（排除午休時間）
      let totalMinutes = 0;
      
      result.rows.forEach(log => {
        const startTime = log.start_time.split(':');
        const endTime = log.end_time.split(':');
        
        const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
        const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
        
        // 排除午休時間
        if (startMinutes < 12 * 60 && endMinutes > 13 * 60) {
          totalMinutes += (endMinutes - startMinutes - 60);
        } else {
          totalMinutes += (endMinutes - startMinutes);
        }
      });
      
      // 計算剩餘需要工作的分鐘數 (8小時 = 480分鐘)
      const remainingMinutes = 480 - totalMinutes;
      
      res.json({
        totalHours: (totalMinutes / 60).toFixed(2),
        remainingHours: Math.max(0, remainingMinutes / 60).toFixed(2),
        isComplete: totalMinutes >= 480
      });
    } catch (error) {
      console.error('獲取今日工作時數失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  }
};

module.exports = WorkLogController;