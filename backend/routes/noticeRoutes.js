// 位置：backend/routes/noticeRoutes.js
const express = require('express');
const router = express.Router();
const NoticeController = require('../controllers/noticeController');
const { authenticateToken } = require('../middleware/auth');

// 管理員權限中間件
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: '需要管理員權限' });
  }
};

// 取得所有公告
router.get('/', 
  authenticateToken, 
  NoticeController.getAllNotices
);

// 獲取未讀公告
router.get('/unread', 
  authenticateToken, 
  NoticeController.getUnreadNotices
);

// 獲取未讀公告數量
router.get('/unread-count', 
  authenticateToken, 
  NoticeController.getUnreadCount
);

// 創建公告（僅管理員）
router.post('/', 
  authenticateToken,
  adminOnly,
  NoticeController.createNotice
);

// 更新公告（僅管理員）
router.put('/:noticeId', 
  authenticateToken,
  adminOnly,
  NoticeController.updateNotice
);

// 刪除公告（僅管理員）
router.delete('/:noticeId', 
  authenticateToken,
  adminOnly,
  NoticeController.deleteNotice
);

// 標記公告為已讀
router.post('/:noticeId/read', 
  authenticateToken, 
  NoticeController.markAsRead
);

module.exports = router;