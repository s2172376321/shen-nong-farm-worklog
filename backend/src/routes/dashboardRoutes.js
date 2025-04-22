const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const db = require('../config/database');

// 添加路由調試日誌
router.use((req, res, next) => {
  console.log('儀表板路由收到請求:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    query: req.query
  });
  next();
});

// 獲取儀表板統計數據
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('開始獲取儀表板統計數據');
    
    // 獲取用戶總數
    const userCountQuery = await db.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCountQuery.rows[0].count);
    console.log('用戶總數:', userCount);

    // 獲取今日新增用戶數
    const todayUsersQuery = await db.query(`
      SELECT COUNT(*) FROM users 
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    const todayUsers = parseInt(todayUsersQuery.rows[0].count);
    console.log('今日新增用戶數:', todayUsers);

    // 獲取本週工作日誌數
    const weeklyLogsQuery = await db.query(`
      SELECT COUNT(*) FROM work_logs 
      WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
    `);
    const weeklyLogs = parseInt(weeklyLogsQuery.rows[0].count);
    console.log('本週工作日誌數:', weeklyLogs);

    // 獲取未讀公告數
    const unreadNoticesQuery = await db.query(`
      SELECT COUNT(*) FROM notices 
      WHERE is_read = false
    `);
    const unreadNotices = parseInt(unreadNoticesQuery.rows[0].count);
    console.log('未讀公告數:', unreadNotices);

    // 獲取低庫存警報數
    const lowStockQuery = await db.query(`
      SELECT COUNT(*) FROM inventory_items 
      WHERE quantity <= minimum_stock
    `);
    const lowStockCount = parseInt(lowStockQuery.rows[0].count);
    console.log('低庫存警報數:', lowStockCount);

    const response = {
      success: true,
      data: {
        userCount,
        todayUsers,
        weeklyLogs,
        unreadNotices,
        lowStockCount
      }
    };
    
    console.log('返回儀表板數據:', response);
    res.json(response);
  } catch (error) {
    console.error('獲取儀表板統計數據失敗:', error);
    res.status(500).json({ 
      success: false,
      message: '獲取數據失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '請稍後再試'
    });
  }
});

module.exports = router; 