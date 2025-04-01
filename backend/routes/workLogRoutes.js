// 位置：backend/routes/workLogRoutes.js
const express = require('express');
const router = express.Router();
const WorkLogController = require('../controllers/workLogController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateWorkLog } = require('../middleware/validationMiddleware');


// 检查 WorkLogController 中的方法是否存在
console.log('WorkLogController methods:', Object.keys(WorkLogController));


// 創建工作日誌
router.post('/', 
  authMiddleware, 
  validateWorkLog, 
  (req, res) => {
    // 如果 createWorkLog 存在，则调用它，否则返回错误
    if (typeof WorkLogController.createWorkLog === 'function') {
      return WorkLogController.createWorkLog(req, res);
    } else {
      return res.status(500).json({ 
        message: '服务器配置错误：createWorkLog 控制器未定义' 
      });
    }
  }
);


router.get('/raw-data', 
  authMiddleware, 
  authMiddleware.adminOnly,  // 確保只有管理員可訪問
  WorkLogController.getRawData
);


// 獲取所有工作日誌（僅管理員）
router.get('/all', 
  authMiddleware, 
  authMiddleware.adminOnly, 
  WorkLogController.getAllWorkLogs
);


// 獲取特定使用者特定日期的工作日誌
router.get('/user/:userId/date/:workDate', 
  authMiddleware, 
  WorkLogController.getUserDailyWorkLogs
);


// 批量審核工作日誌
router.post('/batch-review', 
  authMiddleware, 
  authMiddleware.adminOnly, 
  WorkLogController.batchReviewWorkLogs
);

// 搜索工作日誌
router.get('/search', 
  authMiddleware, 
  (req, res) => {
    if (typeof WorkLogController.searchWorkLogs === 'function') {
      return WorkLogController.searchWorkLogs(req, res);
    } else {
      return res.status(500).json({ 
        message: '服务器配置错误：searchWorkLogs 控制器未定义' 
      });
    }
  }
);


// 管理員覆核工作日誌
router.patch('/:workLogId/review', 
  authMiddleware, 
  authMiddleware.adminOnly, 
  (req, res) => {
    if (typeof WorkLogController.reviewWorkLog === 'function') {
      return WorkLogController.reviewWorkLog(req, res);
    } else {
      return res.status(500).json({ 
        message: '服务器配置错误：reviewWorkLog 控制器未定义' 
      });
    }
  }
);


// 管理員直接查詢工作日誌
router.get('/admin/by-date', 
  authMiddleware, 
  authMiddleware.adminOnly, 
  WorkLogController.getWorkLogsByDate
);

// 獲取位置的作物列表
router.get('/position/:positionCode/crops', 
  authMiddleware, 
  (req, res) => {
    if (typeof WorkLogController.getLocationCrops === 'function') {
      return WorkLogController.getLocationCrops(req, res);
    } else {
      return res.status(500).json({ 
        message: '服务器配置错误：getLocationCrops 控制器未定义' 
      });
    }
  }
);

// 獲取今日工時
router.get('/today-hour', 
  authMiddleware, 
  (req, res) => {
    if (typeof WorkLogController.getTodayHour === 'function') {
      return WorkLogController.getTodayHour(req, res);
    } else {
      return res.status(500).json({ 
        message: '服务器配置错误：getTodayHour 控制器未定义' 
      });
    }
  }
);

// CSV 上傳
router.post('/upload-csv',
  authMiddleware,
  (req, res) => {
    if (typeof WorkLogController.uploadCSV === 'function') {
      return WorkLogController.uploadCSV(req, res);
    } else {
      return res.status(500).json({ 
        message: '服务器配置错误：uploadCSV 控制器未定义' 
      });
    }
  }
);

// 導出工作日誌
router.get('/export',
  authMiddleware,
  (req, res) => {
    if (typeof WorkLogController.exportWorkLogs === 'function') {
      return WorkLogController.exportWorkLogs(req, res);
    } else {
      res.status(501).json({
        message: '导出功能尚未实现'
      });
    }
  }
);


// 獲取特定用戶特定日期的工作日誌
router.get('/user-daily', 
  authMiddleware, 
  WorkLogController.getUserDailyWorkLogs
);


module.exports = router;