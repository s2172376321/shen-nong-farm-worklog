// 位置：backend/routes/statsRoutes.js
const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/statsController');
const authMiddleware = require('../middleware/authMiddleware');

// 取得儀表板統計資訊（僅管理員）
router.get('/dashboard', 
  authMiddleware, 
  authMiddleware.adminOnly, 
  StatsController.getDashboardStats
);

module.exports = router;