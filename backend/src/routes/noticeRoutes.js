const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// 使用內存存儲通知信息
const notices = new Map();

// 獲取所有通知
router.get('/', authenticateToken, (req, res) => {
  try {
    const noticeList = Array.from(notices.values()).map(notice => ({
      id: notice.id,
      title: notice.title,
      content: notice.content,
      createdAt: notice.createdAt,
      updatedAt: notice.updatedAt
    }));
    res.json(noticeList);
  } catch (error) {
    console.error('獲取通知列表失敗:', error);
    res.status(500).json({ error: '獲取通知列表失敗' });
  }
});

// 創建通知
router.post('/', authenticateToken, (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '標題和內容不能為空' });
    }

    const notice = {
      id: Date.now().toString(),
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    notices.set(notice.id, notice);
    res.status(201).json(notice);
  } catch (error) {
    console.error('創建通知失敗:', error);
    res.status(500).json({ error: '創建通知失敗' });
  }
});

// 更新通知
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!notices.has(id)) {
      return res.status(404).json({ error: '通知不存在' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: '標題和內容不能為空' });
    }

    const notice = notices.get(id);
    notice.title = title;
    notice.content = content;
    notice.updatedAt = new Date();

    notices.set(id, notice);
    res.json(notice);
  } catch (error) {
    console.error('更新通知失敗:', error);
    res.status(500).json({ error: '更新通知失敗' });
  }
});

// 刪除通知
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    if (!notices.has(id)) {
      return res.status(404).json({ error: '通知不存在' });
    }

    notices.delete(id);
    res.json({ message: '刪除通知成功' });
  } catch (error) {
    console.error('刪除通知失敗:', error);
    res.status(500).json({ error: '刪除通知失敗' });
  }
});

// 獲取未讀通知數量
router.get('/unread/count', authenticateToken, (req, res) => {
  try {
    const count = Array.from(notices.values()).filter(notice => 
      !notice.readBy || !notice.readBy.includes(req.user.username)
    ).length;
    res.json({ count });
  } catch (error) {
    console.error('獲取未讀通知數量失敗:', error);
    res.status(500).json({ error: '獲取未讀通知數量失敗' });
  }
});

// 標記通知為已讀
router.post('/:id/read', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    if (!notices.has(id)) {
      return res.status(404).json({ error: '通知不存在' });
    }

    const notice = notices.get(id);
    if (!notice.readBy) {
      notice.readBy = [];
    }
    if (!notice.readBy.includes(req.user.username)) {
      notice.readBy.push(req.user.username);
    }

    notices.set(id, notice);
    res.json({ message: '標記通知為已讀成功' });
  } catch (error) {
    console.error('標記通知為已讀失敗:', error);
    res.status(500).json({ error: '標記通知為已讀失敗' });
  }
});

module.exports = router; 