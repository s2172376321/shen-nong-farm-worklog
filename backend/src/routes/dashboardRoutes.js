const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');

// 獲取儀表板統計數據
router.get('/stats', authenticate, (req, res) => {
    DashboardController.getStats(req, res).catch(error => {
        console.error('處理儀表板統計數據請求時發生錯誤:', error);
        res.status(500).json({ message: '處理請求時發生錯誤' });
    });
});

module.exports = router; 