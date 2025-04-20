// 位置：backend/routes/workLogRoutes.js
const express = require('express');
const router = express.Router();
const WorkLogController = require('../controllers/workLogController');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');
const { validateWorkLog } = require('../middleware/validationMiddleware');


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
  (req, res) => {
    if (typeof WorkLogController.batchReviewWorkLogs === 'function') {
      return WorkLogController.batchReviewWorkLogs(req, res);
    } else {
      return res.status(500).json({ 
        message: '服務器配置錯誤：batchReviewWorkLogs 控制器未定義' 
      });
    }
  }
);

// 搜索工作日誌
router.get('/search', 
  authenticate, 
  (req, res) => {
    if (typeof WorkLogController.searchWorkLogs === 'function') {
      return WorkLogController.searchWorkLogs(req, res);
    } else {
      return res.status(500).json({ 
        message: '服務器配置錯誤：searchWorkLogs 控制器未定義' 
      });
    }
  }
);


// 管理員覆核工作日誌
router.patch('/:workLogId/review', 
  authenticate, 
  adminOnly,
  (req, res) => {
    if (typeof WorkLogController.reviewWorkLog === 'function') {
      return WorkLogController.reviewWorkLog(req, res);
    } else {
      return res.status(500).json({ 
        message: '服務器配置錯誤：reviewWorkLog 控制器未定義' 
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