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


router.get('/position/:positionCode/crops', 
  authMiddleware, 
  WorkLogController.getLocationCrops
);


// 獲取今日工時 - 確保此路由已正確定義
router.get('/today-hour', 
  authMiddleware, 
  WorkLogController.getTodayHour
);

// 方案1: 暫時移除上傳CSV路由，直到實現對應的控制器方法
// 如果您需要CSV上傳功能，請實現 WorkLogController.uploadCSV 方法
// router.post('/upload-csv',
//   authMiddleware,
//   WorkLogController.uploadCSV
// );

// 方案2: 使用一個臨時的處理函數
router.post('/upload-csv',
  authMiddleware,
  (req, res) => {
    res.status(501).json({
      message: 'CSV上傳功能尚未實現'
    });
  }
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