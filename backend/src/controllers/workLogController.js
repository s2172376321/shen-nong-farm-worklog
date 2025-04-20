const db = require('../config/database');

// 使用內存存儲工作日誌
const workLogs = new Map();

// 生成測試數據
const generateTestWorkLogs = () => {
  const testWorkLog = {
    id: 'aa032',
    userId: '1',
    username: '1224',
    location: '小空地01',
    crop: '(3)-種植',
    details: '無',
    harvestQuantity: 30.00,
    productCode: '280700002 - A菜',
    startTime: '07:30',
    endTime: '09:00',
    status: 'pending',
    createdAt: new Date('2025/3/25'),
    reviewedBy: null,
    reviewedAt: null
  };
  workLogs.set(testWorkLog.id, testWorkLog);
  console.log('初始化測試數據完成:', testWorkLog);
};

// 初始化測試數據
generateTestWorkLogs();

const WorkLogController = {
  // 創建工作日誌
  async createWorkLog(req, res) {
    try {
      console.log('開始創建工作日誌...');
      const { location, crop, startTime, endTime, harvestQuantity = 0, details = '' } = req.body;
      const userId = req.user.id;
      const username = req.user.username;

      console.log('工作日誌數據:', {
        location,
        crop,
        startTime,
        endTime,
        harvestQuantity,
        details,
        userId,
        username
      });

      const workLog = {
        id: Date.now().toString(),
        userId,
        username,
        location,
        crop,
        startTime,
        endTime,
        harvestQuantity,
        details,
        status: 'pending',
        createdAt: new Date(),
        reviewedBy: null,
        reviewedAt: null
      };

      workLogs.set(workLog.id, workLog);
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
      const logs = Array.from(workLogs.values());
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
      const logs = Array.from(workLogs.values()).filter(log => 
        log.userId === userId && 
        log.createdAt.toDateString() === date.toDateString()
      );
      res.json(logs);
    } catch (error) {
      console.error('獲取用戶日誌失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 批量審核工作日誌
  async batchReviewWorkLogs(req, res) {
    try {
      const { workLogIds, status } = req.body;
      const adminId = req.user.id;
      const reviewedAt = new Date();

      console.log('開始批量審核工作日誌:', {
        workLogIds,
        status,
        adminId,
        reviewedAt
      });

      const updatedLogs = workLogIds.map(id => {
        const log = workLogs.get(id);
        if (log) {
          console.log(`正在審核工作日誌 ${id}...`);
          const updatedLog = {
            ...log,
            status,
            reviewedBy: adminId,
            reviewedAt
          };
          workLogs.set(id, updatedLog);
          console.log(`工作日誌 ${id} 審核完成:`, updatedLog);
          return updatedLog;
        }
        console.log(`找不到工作日誌 ${id}`);
        return null;
      }).filter(Boolean);

      console.log(`批量審核完成，共處理 ${updatedLogs.length} 條記錄`);
      res.json(updatedLogs);
    } catch (error) {
      console.error('批量審核失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 搜索工作日誌
  async searchWorkLogs(req, res) {
    try {
      const { location, crop, startDate, endDate, status } = req.query;
      let logs = Array.from(workLogs.values());

      if (location) {
        logs = logs.filter(log => log.location.includes(location));
      }
      if (crop) {
        logs = logs.filter(log => log.crop.includes(crop));
      }
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        logs = logs.filter(log => 
          log.createdAt >= start && log.createdAt <= end
        );
      }
      if (status) {
        logs = logs.filter(log => log.status === status);
      }

      res.json(logs);
    } catch (error) {
      console.error('搜索工作日誌失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 審核工作日誌
  async reviewWorkLog(req, res) {
    const { workLogId } = req.params;
    const { status } = req.body;
    
    try {
      console.log(`審核工作日誌 - ID: ${workLogId}, 狀態: ${status}`);
      
      // 檢查工作日誌是否存在
      const workLog = workLogs.get(workLogId);
      if (!workLog) {
        console.log(`工作日誌不存在 - ID: ${workLogId}`);
        return res.status(404).json({ error: '工作日誌不存在' });
      }
      
      // 更新工作日誌狀態
      const updatedWorkLog = {
        ...workLog,
        status,
        reviewedAt: new Date().toISOString(),
        reviewedBy: req.user.id
      };
      
      // 保存更新後的工作日誌
      workLogs.set(workLogId, updatedWorkLog);
      
      console.log(`工作日誌審核成功 - ID: ${workLogId}, 新狀態: ${status}`);
      
      // 返回更新後的工作日誌，使用前端期望的格式
      return res.json({
        workLog: {
          ...updatedWorkLog,
          id: workLogId  // 確保 ID 也包含在響應中
        }
      });
      
    } catch (error) {
      console.error('審核工作日誌時發生錯誤:', error);
      return res.status(500).json({ error: '審核工作日誌失敗' });
    }
  },

  // 管理員直接查詢工作日誌
  async getWorkLogsByDate(req, res) {
    try {
      const { date, status } = req.query;
      const queryDate = new Date(date);
      let logs = Array.from(workLogs.values()).filter(log => 
        log.createdAt.toDateString() === queryDate.toDateString()
      );

      if (status) {
        logs = logs.filter(log => log.status === status);
      }

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
      const crops = Array.from(workLogs.values())
        .filter(log => log.location === positionCode)
        .map(log => log.crop)
        .filter((crop, index, self) => self.indexOf(crop) === index)
        .sort();
      res.json(crops);
    } catch (error) {
      console.error('獲取位置作物列表失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 獲取今日工時
  async getTodayHour(req, res) {
    try {
      const today = new Date();
      const logs = Array.from(workLogs.values()).filter(log => 
        log.createdAt.toDateString() === today.toDateString()
      );

      const totalHours = logs.reduce((total, log) => {
        const start = new Date(`1970-01-01T${log.startTime}`);
        const end = new Date(`1970-01-01T${log.endTime}`);
        const hours = (end - start) / (1000 * 60 * 60);
        return total + hours;
      }, 0);

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