const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/authMiddleware');

// 使用身份驗證中間件
router.use(authenticate);

// 獲取所有通知
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM notices 
      ORDER BY created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('獲取通知失敗:', error);
    res.status(500).json({ error: '獲取通知失敗' });
  }
});

// 獲取未讀通知
router.get('/unread', async (req, res) => {
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
router.post('/:id/read', async (req, res) => {
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

// 刪除通知
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('嘗試刪除通知:', id);

    // 開始資料庫事務
    await db.query('BEGIN');

    try {
      // 檢查通知是否存在
      const checkResult = await db.query('SELECT * FROM notices WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        console.log('通知不存在:', id);
        await db.query('ROLLBACK');
        return res.status(404).json({ error: '通知不存在' });
      }

      // 先刪除相關的已讀記錄
      console.log('刪除相關的已讀記錄...');
      await db.query('DELETE FROM notice_reads WHERE notice_id = $1', [id]);

      // 然後刪除通知本身
      console.log('刪除通知本身...');
      await db.query('DELETE FROM notices WHERE id = $1', [id]);

      // 提交事務
      await db.query('COMMIT');
      console.log('通知刪除成功:', id);
      
      res.json({ message: '通知已刪除' });
    } catch (innerError) {
      // 如果過程中出現錯誤，回滾事務
      await db.query('ROLLBACK');
      throw innerError;
    }
  } catch (error) {
    console.error('刪除通知失敗:', error);
    res.status(500).json({ 
      error: '刪除通知失敗',
      details: error.message,
      code: error.code
    });
  }
});

// 創建新通知
router.post('/', async (req, res) => {
  try {
    const { title, content, type = 'info' } = req.body;
    
    // 驗證必要欄位
    if (!title || !content) {
      return res.status(400).json({ error: '標題和內容為必填項' });
    }

    const result = await db.query(`
      INSERT INTO notices (title, content, type, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [title, content, type, req.user.id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('創建通知失敗:', error);
    res.status(500).json({ error: '創建通知失敗' });
  }
});

module.exports = router; 