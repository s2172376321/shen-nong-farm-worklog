// 位置：backend/routes/workLogRoutes.js
const express = require('express');
const router = express.Router();
const WorkLogController = require('../controllers/workLogController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateWorkLog } = require('../middleware/validationMiddleware');

// 創建工作日誌
router.post('/', 
  authMiddleware, 
  validateWorkLog, 
  WorkLogController.createWorkLog
);

// 搜索工作日誌
router.get('/search', 
  authMiddleware, 
  WorkLogController.searchWorkLogs
);

// 管理員覆核工作日誌
router.patch('/:workLogId/review', 
  authMiddleware, 
  authMiddleware.adminOnly, 
  WorkLogController.reviewWorkLog
);

// 獲取位置的作物列表
router.get('/position/:positionCode/crops', 
  authMiddleware, 
  WorkLogController.getLocationCrops
);

// 獲取今日工時
router.get('/today-hour', 
  authMiddleware, 
  WorkLogController.getTodayHour
);

// CSV 上傳
router.post('/upload-csv',
  authMiddleware,
  WorkLogController.uploadCSV
);

// 導出工作日誌
router.get('/export',
  authMiddleware,
  (req, res) => {
    res.status(501).json({
      message: '導出功能尚未實現'
    });
  }
);

module.exports = router;