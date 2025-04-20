const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// 使用身份驗證和管理員權限中間件
router.use(authenticate);
router.use(adminMiddleware);

// 獲取儀表板數據
router.get('/dash', async (req, res) => {
  try {
    // 獲取用戶總數
    const userCountQuery = await db.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCountQuery.rows[0].count);

    // 獲取今日新增用戶數
    const todayUsersQuery = await db.query(`
      SELECT COUNT(*) FROM users 
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    const todayUsers = parseInt(todayUsersQuery.rows[0].count);

    // 獲取本週工作日誌數
    const weeklyLogsQuery = await db.query(`
      SELECT COUNT(*) FROM work_logs 
      WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
    `);
    const weeklyLogs = parseInt(weeklyLogsQuery.rows[0].count);

    // 獲取未處理的通知數
    const unreadNoticesQuery = await db.query(`
      SELECT COUNT(*) FROM notices 
      WHERE is_read = false
    `);
    const unreadNotices = parseInt(unreadNoticesQuery.rows[0].count);

    res.json({
      userCount,
      todayUsers,
      weeklyLogs,
      unreadNotices
    });
  } catch (error) {
    console.error('獲取儀表板數據失敗:', error);
    res.status(500).json({ error: '獲取數據失敗' });
  }
});

// 獲取未讀通知
router.get('/notices/unread', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM notices 
      WHERE is_read = false 
      ORDER BY created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('獲取未讀通知失敗:', error);
    res.status(500).json({ error: '獲取通知失敗' });
  }
});

// 標記通知為已讀
router.post('/notices/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(`
      UPDATE notices 
      SET is_read = true 
      WHERE id = $1
    `, [id]);
    
    res.json({ message: '已標記為已讀' });
  } catch (error) {
    console.error('標記通知失敗:', error);
    res.status(500).json({ error: '標記通知失敗' });
  }
});

module.exports = router; 