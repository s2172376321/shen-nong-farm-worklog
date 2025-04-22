const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// 獲取所有工作記錄
router.get('/', authenticateToken, async (req, res) => {
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
router.post('/', authenticateToken, async (req, res) => {
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
router.put('/:id', authenticateToken, async (req, res) => {
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
router.delete('/:id', authenticateToken, async (req, res) => {
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
router.get('/search', authenticateToken, async (req, res) => {
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

module.exports = router; 