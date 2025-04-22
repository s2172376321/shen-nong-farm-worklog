// 位置：backend/routes/workLogRoutes.js
const express = require('express');
const router = express.Router();
const WorkLogController = require('../controllers/workLogController');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');
const { validateWorkLog } = require('../middleware/validationMiddleware');
const db = require('../database/db');


// 檢查 WorkLogController 中的方法是否存在
console.log('WorkLogController methods:', Object.keys(WorkLogController));


// 創建工作日誌
router.post('/', 
  authenticate, 
  validateWorkLog, 
  (req, res) => {
    if (typeof WorkLogController.createWorkLog === 'function') {
      return WorkLogController.createWorkLog(req, res);
    } else {
      return res.status(500).json({ 
        message: '服務器配置錯誤：createWorkLog 控制器未定義' 
      });
    }
  }
);


// 獲取原始數據
router.get('/raw-data', 
  authenticate, 
  adminOnly,
  (req, res) => {
    if (typeof WorkLogController.getRawData === 'function') {
      return WorkLogController.getRawData(req, res);
    } else {
      return res.status(500).json({ 
        message: '服務器配置錯誤：getRawData 控制器未定義' 
      });
    }
  }
);


// 獲取所有工作日誌（僅管理員）
router.get('/all', 
  authenticate, 
  adminOnly,
  (req, res) => {
    if (typeof WorkLogController.getAllWorkLogs === 'function') {
      return WorkLogController.getAllWorkLogs(req, res);
    } else {
      return res.status(500).json({ 
        message: '服務器配置錯誤：getAllWorkLogs 控制器未定義' 
      });
    }
  }
);


// 獲取特定使用者特定日期的工作日誌
router.get('/user/:userId/date/:workDate', 
  authenticate,
  (req, res) => {
    if (typeof WorkLogController.getUserDailyWorkLogs === 'function') {
      return WorkLogController.getUserDailyWorkLogs(req, res);
    } else {
      return res.status(500).json({ 
        message: '服務器配置錯誤：getUserDailyWorkLogs 控制器未定義' 
      });
    }
  }
);


// 批量審核工作日誌
router.post('/batch-review', 
  authenticate, 
  adminOnly,
  async (req, res) => {
    try {
      const { workLogIds, status } = req.body;

      // 驗證輸入
      if (!workLogIds || !Array.isArray(workLogIds) || workLogIds.length === 0) {
        return res.status(400).json({ message: '請提供有效的工作日誌ID列表' });
      }

      if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: '請提供有效的審核狀態' });
      }

      if (typeof WorkLogController.batchReviewWorkLogs === 'function') {
        return WorkLogController.batchReviewWorkLogs(req, res);
      } else {
        console.error('batchReviewWorkLogs 控制器未定義');
        return res.status(500).json({ 
          message: '服務器配置錯誤：batchReviewWorkLogs 控制器未定義' 
        });
      }
    } catch (error) {
      console.error('批量審核路由錯誤:', {
        error: error.message,
        stack: error.stack,
        body: req.body,
        user: req.user ? { id: req.user.id, role: req.user.role } : '未認證用戶'
      });
      res.status(500).json({ 
        message: '批量審核失敗',
        error: process.env.NODE_ENV === 'development' ? error.message : '請稍後再試'
      });
    }
  }
);

// 搜索工作日誌
router.get('/search', 
  authenticate,
  async (req, res) => {
    try {
      const { 
        userId,
        location,
        crop,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 10
      } = req.query;

      console.log('收到工作日誌搜索請求:', {
        query: req.query,
        user: req.user ? { id: req.user.id, role: req.user.role } : '未認證用戶'
      });

      // 構建查詢
      let queryText = `
        SELECT 
          wl.*,
          u.username,
          COALESCE(wl.position_name, wl.location_code) as location,
          COALESCE(wl.work_category_name, wl.crop) as work_type,
          TO_CHAR(wl.created_at, 'YYYY-MM-DD') as work_date,
          CASE 
            WHEN wl.status = 'pending' THEN '待審核'
            WHEN wl.status = 'approved' THEN '已核准'
            WHEN wl.status = 'rejected' THEN '已拒絕'
            ELSE wl.status
          END as status_display
        FROM work_logs wl
        JOIN users u ON wl.user_id = u.id
        WHERE 1=1
      `;
      const values = [];
      let paramIndex = 1;

      // 添加用戶過濾
      if (userId) {
        queryText += ` AND wl.user_id = $${paramIndex}`;
        values.push(userId);
        paramIndex++;
      }

      // 添加位置過濾
      if (location) {
        queryText += ` AND (wl.location_code ILIKE $${paramIndex} OR wl.position_name ILIKE $${paramIndex})`;
        values.push(`%${location}%`);
        paramIndex++;
      }

      // 添加作物過濾
      if (crop) {
        queryText += ` AND (wl.work_category_name ILIKE $${paramIndex} OR wl.crop ILIKE $${paramIndex})`;
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

      console.log('執行查詢:', {
        queryText,
        values
      });

      // 執行查詢
      const result = await db.query(queryText, values);
      
      // 獲取總記錄數
      const countQuery = queryText.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) FROM').split('ORDER BY')[0];
      const countResult = await db.query(countQuery, values.slice(0, -2));
      const totalCount = parseInt(countResult.rows[0].count);
      
      // 標準化時間格式
      const formattedResults = result.rows.map(log => ({
        ...log,
        start_time: log.start_time ? log.start_time.substring(0, 5) : null,
        end_time: log.end_time ? log.end_time.substring(0, 5) : null,
        created_at: new Date(log.created_at).toISOString(),
        updated_at: log.updated_at ? new Date(log.updated_at).toISOString() : null,
        reviewed_at: log.reviewed_at ? new Date(log.reviewed_at).toISOString() : null
      }));

      console.log('查詢結果:', {
        totalCount,
        resultCount: formattedResults.length,
        firstRow: formattedResults[0]
      });
      
      res.json({
        success: true,
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
        stack: error.stack,
        query: req.query,
        user: req.user ? { id: req.user.id, role: req.user.role } : '未認證用戶'
      });
      res.status(500).json({ 
        success: false,
        message: '搜索工作日誌失敗',
        error: process.env.NODE_ENV === 'development' ? error.message : '請稍後再試'
      });
    }
  }
);


// 管理員覆核工作日誌
router.patch('/:workLogId/review', 
  authenticate, 
  adminOnly,
  async (req, res) => {
    try {
      const { workLogId } = req.params;
      const { status } = req.body;

      // 驗證輸入
      if (!workLogId) {
        return res.status(400).json({ message: '請提供有效的工作日誌ID' });
      }

      if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: '請提供有效的審核狀態' });
      }

      if (typeof WorkLogController.reviewWorkLog === 'function') {
        return WorkLogController.reviewWorkLog(req, res);
      } else {
        console.error('reviewWorkLog 控制器未定義');
        return res.status(500).json({ 
          message: '服務器配置錯誤：reviewWorkLog 控制器未定義' 
        });
      }
    } catch (error) {
      console.error('工單審核路由錯誤:', {
        error: error.message,
        stack: error.stack,
        params: req.params,
        body: req.body,
        user: req.user ? { id: req.user.id, role: req.user.role } : '未認證用戶'
      });
      res.status(500).json({ 
        message: '工單審核失敗',
        error: process.env.NODE_ENV === 'development' ? error.message : '請稍後再試'
      });
    }
  }
);


// 管理員直接查詢工作日誌
router.get('/admin/by-date', 
  authenticate, 
  adminOnly,
  (req, res) => {
    if (typeof WorkLogController.getWorkLogsByDate === 'function') {
      return WorkLogController.getWorkLogsByDate(req, res);
    } else {
      return res.status(500).json({ 
        message: '服務器配置錯誤：getWorkLogsByDate 控制器未定義' 
      });
    }
  }
);

// 獲取位置的作物列表
router.get('/position/:positionCode/crops', 
  authenticate, 
  (req, res) => {
    if (typeof WorkLogController.getLocationCrops === 'function') {
      return WorkLogController.getLocationCrops(req, res);
    } else {
      return res.status(500).json({ 
        message: '服務器配置錯誤：getLocationCrops 控制器未定義' 
      });
    }
  }
);

// 獲取今日工時
router.get('/today-hour', 
  authenticate, 
  (req, res) => {
    if (typeof WorkLogController.getTodayHour === 'function') {
      return WorkLogController.getTodayHour(req, res);
    } else {
      return res.status(500).json({ 
        message: '服務器配置錯誤：getTodayHour 控制器未定義' 
      });
    }
  }
);

// CSV 上傳
router.post('/upload-csv',
  authenticate,
  (req, res) => {
    if (typeof WorkLogController.uploadCSV === 'function') {
      return WorkLogController.uploadCSV(req, res);
    } else {
      return res.status(500).json({ 
        message: '服務器配置錯誤：uploadCSV 控制器未定義' 
      });
    }
  }
);

// 導出工作日誌
router.get('/export',
  authenticate,
  (req, res) => {
    if (typeof WorkLogController.exportWorkLogs === 'function') {
      return WorkLogController.exportWorkLogs(req, res);
    } else {
      return res.status(501).json({
        message: '導出功能尚未實現'
      });
    }
  }
);


// 獲取特定用戶特定日期的工作日誌
router.get('/user-daily', 
  authenticate,
  (req, res) => {
    if (typeof WorkLogController.getUserDailyWorkLogs === 'function') {
      return WorkLogController.getUserDailyWorkLogs(req, res);
    } else {
      return res.status(500).json({ 
        message: '服務器配置錯誤：getUserDailyWorkLogs 控制器未定義' 
      });
    }
  }
);


module.exports = router;