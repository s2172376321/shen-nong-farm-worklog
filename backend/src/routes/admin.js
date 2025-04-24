const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { authenticate } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// 使用身份驗證和管理員權限中間件
router.use(authenticate);
router.use(adminMiddleware);

// 獲取儀表板數據
router.get('/dash', async (req, res) => {
  try {
    console.log('收到儀表板數據請求:', {
      userId: req.user.id,
      userRole: req.user.role
    });

    // 獲取用戶總數
    const userCountQuery = await sequelize.query('SELECT COUNT(*) FROM users', {
      type: sequelize.QueryTypes.SELECT
    });
    const userCount = parseInt(userCountQuery[0].count);

    // 獲取工作日誌總數
    const workLogCountQuery = await sequelize.query('SELECT COUNT(*) FROM work_logs', {
      type: sequelize.QueryTypes.SELECT
    });
    const workLogCount = parseInt(workLogCountQuery[0].count);

    // 獲取待審核的工作日誌數量
    const pendingWorkLogsQuery = await sequelize.query(
      'SELECT COUNT(*) FROM work_logs WHERE status = $1',
      {
        replacements: ['pending'],
        type: sequelize.QueryTypes.SELECT
      }
    );
    const pendingWorkLogsCount = parseInt(pendingWorkLogsQuery[0].count);

    // 獲取最近7天的工作日誌統計
    const weeklyStatsQuery = await sequelize.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM work_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        userCount,
        workLogCount,
        pendingWorkLogsCount,
        weeklyStats: weeklyStatsQuery
      }
    });
  } catch (error) {
    console.error('獲取儀表板數據失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取儀表板數據失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '請稍後再試'
    });
  }
});

// 獲取未讀通知
router.get('/notices/unread', async (req, res) => {
  try {
    const result = await sequelize.query(`
      SELECT * FROM notices 
      WHERE is_read = false 
      ORDER BY created_at DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
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
    
    await sequelize.query(`
      UPDATE notices 
      SET is_read = true 
      WHERE id = $1
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.UPDATE
    });
    
    res.json({ message: '已標記為已讀' });
  } catch (error) {
    console.error('標記通知失敗:', error);
    res.status(500).json({ error: '標記通知失敗' });
  }
});

module.exports = router; 