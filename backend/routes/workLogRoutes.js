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

// 獲取今日工時 - 確保此路由已正確定義
router.get('/today-hour', 
  authMiddleware, 
  WorkLogController.getTodayHour
);

module.exports = router;