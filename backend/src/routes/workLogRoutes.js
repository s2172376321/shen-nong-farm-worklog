// 位置：backend/routes/workLogRoutes.js
const express = require('express');
const router = express.Router();
const WorkLogController = require('../controllers/workLogController');
const { authenticateToken } = require('../middleware/auth');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');
const { validateWorkLog } = require('../middleware/validationMiddleware');
const { sequelize } = require('../config/database');

// 所有路由都需要認證
router.use(authenticateToken);

// 檢查 WorkLogController 中的方法是否存在
console.log('WorkLogController methods:', Object.keys(WorkLogController));

// 創建工作日誌
router.post('/', WorkLogController.createWorkLog);

// 獲取所有工作日誌
router.get('/', WorkLogController.getAllWorkLogs);

// 獲取特定日期的工作日誌
router.get('/date/:date', WorkLogController.getWorkLogsByDate);

// 獲取使用者的每日工作日誌
router.get('/user/daily', WorkLogController.getUserDailyWorkLogs);

// 搜尋工作日誌
router.get('/search', WorkLogController.searchWorkLogs);

// 審核工作日誌
router.put('/:id/review', WorkLogController.reviewWorkLog);

// 批量審核工作日誌
router.put('/batch-review', WorkLogController.batchReviewWorkLogs);

// 上傳 CSV 檔案
router.post('/upload-csv', WorkLogController.uploadCSV);

// 匯出工作日誌
router.get('/export', WorkLogController.exportWorkLogs);

// 獲取原始數據
router.get('/raw-data', 
  isAdmin,
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

// 獲取特定使用者特定日期的工作日誌
router.get('/user/:userId/date/:workDate', 
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

// 管理員覆核工作日誌
router.patch('/:workLogId/review', 
  isAdmin,
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
  isAdmin,
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

module.exports = router;