const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/statsController');
const { authenticateToken } = require('../middleware/auth');

// 獲取儀表板統計資訊
router.get('/dashboard/stats', authenticateToken, StatsController.getDashboardStats);

module.exports = router; 