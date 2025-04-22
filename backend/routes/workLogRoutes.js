const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');
const WorkLogController = require('../controllers/WorkLogController');

// 獲取所有工作記錄
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM work_logs ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('獲取工作記錄失敗:', error);
    res.status(500).json({ message: '獲取工作記錄失敗' });
  }
});

// 創建工作記錄
router.post('/', authMiddleware, async (req, res) => {
  const { title, content, work_hours } = req.body;
  const userId = req.user.id;

  try {
    const result = await db.query(
      'INSERT INTO work_logs (user_id, title, content, work_hours) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, title, content, work_hours]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('創建工作記錄失敗:', error);
    res.status(500).json({ message: '創建工作記錄失敗' });
  }
});

// 更新工作記錄
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, content, work_hours } = req.body;
  const userId = req.user.id;

  try {
    // 檢查記錄是否存在且屬於當前用戶
    const checkResult = await db.query(
      'SELECT * FROM work_logs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: '找不到工作記錄或無權限修改' });
    }

    const result = await db.query(
      'UPDATE work_logs SET title = $1, content = $2, work_hours = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [title, content, work_hours, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('更新工作記錄失敗:', error);
    res.status(500).json({ message: '更新工作記錄失敗' });
  }
});

// 刪除工作記錄
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // 檢查記錄是否存在且屬於當前用戶
    const checkResult = await db.query(
      'SELECT * FROM work_logs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: '找不到工作記錄或無權限刪除' });
    }

    await db.query('DELETE FROM work_logs WHERE id = $1', [id]);
    res.json({ message: '工作記錄已刪除' });
  } catch (error) {
    console.error('刪除工作記錄失敗:', error);
    res.status(500).json({ message: '刪除工作記錄失敗' });
  }
});

// 搜索工作記錄
router.get('/search', authMiddleware, async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  
  try {
    const result = await db.query(
      'SELECT * FROM work_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('搜索工作記錄失敗:', error);
    res.status(500).json({ message: '搜索工作記錄失敗' });
  }
});

// 獲取今日工時
router.get('/today-hours', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  try {
    const result = await db.query(
      `SELECT 
        COALESCE(SUM(work_hours), 0) as total_hours,
        CASE 
          WHEN COALESCE(SUM(work_hours), 0) >= 8 THEN true
          ELSE false
        END as is_complete,
        8 - COALESCE(SUM(work_hours), 0) as remaining_hours
      FROM work_logs 
      WHERE user_id = $1 
      AND DATE(created_at) = $2`,
      [userId, today]
    );

    res.json({
      total_hours: result.rows[0].total_hours || "0.00",
      remaining_hours: result.rows[0].remaining_hours || "8.00",
      is_complete: result.rows[0].is_complete || false
    });
  } catch (error) {
    console.error('獲取今日工時失敗:', error);
    res.status(500).json({ message: '獲取今日工時失敗' });
  }
});

// 獲取特定使用者特定日期的工作日誌
router.get('/user/:userId/date/:workDate', 
  authMiddleware,
  (req, res) => {
    // 將路由參數轉換為查詢參數
    req.query = {
      userId: req.params.userId,
      workDate: req.params.workDate
    };
    
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