const db = require('../config/database');
const { WorkLog } = require('../models');

const WorkLogController = {
  // 創建工作日誌
  async createWorkLog(req, res) {
    try {
      console.log('開始創建工作日誌...');
      const { location_code, position_name, work_category_name, start_time, end_time, harvest_quantity = 0, details = '' } = req.body;
      const user_id = req.user.id;

      console.log('工作日誌數據:', {
        location_code,
        position_name,
        work_category_name,
        start_time,
        end_time,
        harvest_quantity,
        details,
        user_id
      });

      const workLog = await WorkLog.create({
        id: Date.now().toString(),
        user_id,
        location_code,
        position_name,
        work_category_name,
        start_time,
        end_time,
        harvest_quantity,
        details,
        status: 'pending'
      });

      console.log('工作日誌創建成功:', workLog);
      res.status(201).json(workLog);
    } catch (error) {
      console.error('創建工作日誌失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 獲取原始數據
  async getRawData(req, res) {
    try {
      const result = await db.query('SELECT * FROM work_logs ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (error) {
      console.error('獲取原始數據失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 獲取所有工作日誌
  async getAllWorkLogs(req, res) {
    try {
      console.log('開始獲取所有工作日誌...');
      const logs = await WorkLog.findAll({
        order: [['created_at', 'DESC']]
      });
      console.log(`成功獲取 ${logs.length} 條工作日誌`);
      res.json(logs);
    } catch (error) {
      console.error('獲取所有工作日誌失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 獲取特定使用者特定日期的工作日誌
  async getUserDailyWorkLogs(req, res) {
    try {
      const { userId, workDate } = req.params;
      const date = new Date(workDate);
      const logs = await WorkLog.findAll({
        where: {
          user_id: userId,
          created_at: {
            [db.Sequelize.Op.gte]: date,
            [db.Sequelize.Op.lt]: new Date(date.getTime() + 24 * 60 * 60 * 1000)
          }
        },
        order: [['created_at', 'ASC']]
      });
      res.json(logs);
    } catch (error) {
      console.error('獲取用戶日誌失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 批量審核工作日誌
  async batchReviewWorkLogs(req, res) {
    const { workLogIds, status } = req.body;
    const reviewerId = req.user.id;

    try {
      // 驗證輸入
      if (!workLogIds || !Array.isArray(workLogIds) || workLogIds.length === 0) {
        return res.status(400).json({ 
          message: '請提供有效的工作日誌ID列表'
        });
      }

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ 
          message: '請提供有效的審核狀態'
        });
      }

      // 更新工作日誌
      const updateQuery = `
        UPDATE work_logs 
        SET status = $1, 
            reviewer_id = $2,
            reviewed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($3::uuid[])
        RETURNING id, status, reviewed_at, reviewer_id,
                start_time, end_time, location_code, position_name,
                work_category_name, details, harvest_quantity,
                product_name, product_quantity, user_id
      `;

      const values = [status, reviewerId, workLogIds];
      const result = await db.query(updateQuery, values);
      
      console.log(`批量審核完成，更新了 ${result.rows.length} 條記錄`);
      
      res.json({ 
        message: `成功批量審核 ${result.rows.length} 條工作日誌`,
        workLogs: result.rows
      });
    } catch (error) {
      console.error('批量審核工作日誌失敗:', {
        error: error.message,
        stack: error.stack,
        workLogIds,
        status,
        reviewerId
      });
      
      res.status(500).json({ 
        message: '伺服器錯誤，請稍後再試',
        error: error.message
      });
    }
  },

  // 搜索工作日誌
  async searchWorkLogs(req, res) {
    try {
      const { location, crop, startDate, endDate, status, page = 1, limit = 20 } = req.query;
      const userId = req.user.id;
      
      console.log('收到搜索請求:', {
        location, crop, startDate, endDate, status, page, limit,
        userId, userRole: req.user?.role
      });

      // 建立基本查詢
      let queryText = `
        SELECT wl.id, wl.user_id, wl.location_code, wl.work_category_name, 
               wl.start_time, wl.end_time, wl.details, 
               wl.status, wl.created_at, u.username
        FROM work_logs wl
        JOIN users u ON wl.user_id = u.id
        WHERE 1=1
      `;
      
      const values = [];
      let paramIndex = 1;

      // 如果不是管理員，只能查看自己的工作日誌
      if (!req.user.role || req.user.role !== 'admin') {
        queryText += ` AND wl.user_id = $${paramIndex}`;
        values.push(userId);
        paramIndex++;
      }

      // 添加位置過濾
      if (location) {
        queryText += ` AND wl.location_code ILIKE $${paramIndex}`;
        values.push(`%${location}%`);
        paramIndex++;
      }

      // 添加作物過濾
      if (crop) {
        queryText += ` AND wl.work_category_name ILIKE $${paramIndex}`;
        values.push(`%${crop}%`);
        paramIndex++;
      }

      // 添加狀態過濾
      if (status) {
        queryText += ` AND wl.status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }

      // 添加日期過濾
      if (startDate && endDate) {
        queryText += ` AND DATE(wl.created_at) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        values.push(startDate, endDate);
        paramIndex += 2;
      } else if (startDate) {
        queryText += ` AND DATE(wl.created_at) = $${paramIndex}`;
        values.push(startDate);
        paramIndex++;
      }

      // 添加排序
      queryText += ' ORDER BY wl.created_at DESC';
      
      // 添加分頁
      const offset = (page - 1) * limit;
      queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      console.log('執行 SQL:', queryText);
      console.log('參數:', values);

      // 執行查詢
      const result = await db.query(queryText, values);
      
      // 獲取總記錄數
      const countQuery = queryText.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) FROM').split('ORDER BY')[0];
      const countResult = await db.query(countQuery, values.slice(0, -2));
      const totalCount = parseInt(countResult.rows[0].count);
      
      // 標準化時間格式
      const formattedResults = result.rows.map(log => ({
        ...log,
        start_time: log.start_time ? log.start_time.substring(0, 5) : log.start_time,
        end_time: log.end_time ? log.end_time.substring(0, 5) : log.end_time
      }));
      
      res.json({
        data: formattedResults,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('搜索工作日誌失敗:', {
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({ 
        message: '搜索工作日誌失敗，請稍後再試',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // 審核工作日誌
  async reviewWorkLog(req, res) {
    const { workLogId } = req.params;
    const { status } = req.body;
    
    try {
      console.log('工作日誌審核請求:', {
        workLogId,
        status,
        reviewerId: req.user.id,
        timestamp: new Date().toISOString()
      });

      // 驗證狀態
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          message: '無效的審核狀態',
          status
        });
      }
  
      // 檢查工作日誌是否存在
      const workLog = await WorkLog.findOne({
        where: { id: workLogId },
        attributes: ['id', 'status', 'user_id', 'start_time', 'end_time', 
                   'location_code', 'position_name', 'work_category_name',
                   'details', 'harvest_quantity', 'product_name', 'product_quantity']
      });
      
      if (!workLog) {
        return res.status(404).json({ 
          message: '工作日誌不存在',
          workLogId
        });
      }
      
      console.log(`找到工作日誌，當前狀態: ${workLog.status}`);
  
      // 更新工作日誌狀態
      const [updatedCount, updatedWorkLogs] = await WorkLog.update(
        {
          status: status,
          reviewer_id: req.user.id,
          reviewed_at: new Date(),
          updated_at: new Date()
        },
        {
          where: { id: workLogId },
          returning: true,
          attributes: ['id', 'status', 'reviewed_at', 'reviewer_id',
                      'start_time', 'end_time', 'location_code', 'position_name',
                      'work_category_name', 'details', 'harvest_quantity',
                      'product_name', 'product_quantity', 'user_id']
        }
      );
      
      if (updatedCount === 0) {
        throw new Error('更新工作日誌失敗');
      }

      const updatedWorkLog = updatedWorkLogs[0];
      
      console.log('工作日誌審核成功:', {
        workLogId: updatedWorkLog.id,
        newStatus: updatedWorkLog.status,
        reviewedAt: updatedWorkLog.reviewed_at,
        reviewerId: updatedWorkLog.reviewer_id
      });
      
      res.json({ 
        message: '工作日誌審核成功',
        workLog: updatedWorkLog
      });
    } catch (error) {
      console.error('審核工作日誌失敗:', {
        error: error.message,
        stack: error.stack,
        workLogId,
        status,
        reviewerId: req.user.id
      });
      
      res.status(500).json({ 
        message: '伺服器錯誤，請稍後再試',
        error: error.message
      });
    }
  },

  // 管理員直接查詢工作日誌
  async getWorkLogsByDate(req, res) {
    try {
      const { date, status } = req.query;
      const queryDate = new Date(date);
      const logs = await WorkLog.findAll({
        where: {
          created_at: {
            [db.Sequelize.Op.gte]: queryDate,
            [db.Sequelize.Op.lt]: new Date(queryDate.getTime() + 24 * 60 * 60 * 1000)
          },
          status: status
        },
        order: [['created_at', 'ASC']]
      });

      res.json(logs);
    } catch (error) {
      console.error('按日期查詢工作日誌失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 獲取位置的作物列表
  async getLocationCrops(req, res) {
    try {
      const { positionCode } = req.params;
      const crops = await WorkLog.findAll({
        attributes: ['work_category_name'],
        where: { location_code: positionCode },
        group: ['work_category_name'],
        order: [['work_category_name', 'ASC']]
      });
      res.json(crops.map(crop => crop.work_category_name));
    } catch (error) {
      console.error('獲取位置作物列表失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 獲取今日工時
  async getTodayHour(req, res) {
    try {
      const today = new Date();
      const logs = await WorkLog.findAll({
        where: {
          created_at: {
            [db.Sequelize.Op.gte]: today,
            [db.Sequelize.Op.lt]: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        },
        attributes: [
          [db.Sequelize.fn('SUM', db.Sequelize.col('harvest_quantity')), 'totalHours']
        ]
      });

      const totalHours = logs.length > 0 ? logs[0].dataValues.totalHours : 0;

      res.json({ totalHours });
    } catch (error) {
      console.error('獲取今日工時失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // CSV 上傳
  async uploadCSV(req, res) {
    try {
      if (!req.files || !req.files.file) {
        return res.status(400).json({ message: '請上傳 CSV 檔案' });
      }

      const file = req.files.file;
      // 在這裡處理 CSV 檔案
      // 需要實現 CSV 解析和資料匯入邏輯

      res.json({ message: 'CSV 上傳成功' });
    } catch (error) {
      console.error('CSV 上傳失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 導出工作日誌
  async exportWorkLogs(req, res) {
    try {
      const { startDate, endDate, format = 'csv' } = req.query;
      
      let queryText = `
        SELECT w.*, u.username 
        FROM work_logs w
        LEFT JOIN users u ON w.user_id = u.id
        WHERE 1=1
      `;
      const values = [];

      if (startDate && endDate) {
        queryText += ` AND DATE(w.created_at) BETWEEN $1 AND $2`;
        values.push(startDate, endDate);
      }

      queryText += ` ORDER BY w.created_at DESC`;

      const result = await db.query(queryText, values);
      
      if (format === 'csv') {
        // 實現 CSV 導出邏輯
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=work_logs_${startDate}_${endDate}.csv`);
        // 需要實現 CSV 格式轉換邏輯
        res.send('Date,User,Location,Crop,Start Time,End Time,Status\n');
      } else {
        res.json(result.rows);
      }
    } catch (error) {
      console.error('導出工作日誌失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  }
};

module.exports = WorkLogController; 