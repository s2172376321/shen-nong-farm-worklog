// 位置：backend/routes/noticeRoutes.js
const express = require('express');
const router = express.Router();
const NoticeController = require('../controllers/noticeController');
const authMiddleware = require('../middleware/authMiddleware');

// 取得所有公告
router.get('/', 
  authMiddleware, 
  NoticeController.getAllNotices
);

// 創建公告（僅管理員）
router.post('/', 
  authMiddleware, 
  authMiddleware.adminOnly, 
  NoticeController.createNotice
);

// 更新公告（僅管理員）
router.put('/:noticeId', 
  authMiddleware, 
  authMiddleware.adminOnly, 
  NoticeController.updateNotice
);

// 刪除公告（僅管理員）
router.delete('/:noticeId', 
  authMiddleware, 
  authMiddleware.adminOnly, 
  NoticeController.deleteNotice
);

// 標記公告為已讀
router.post('/:noticeId/read', 
  authMiddleware, 
  NoticeController.markAsRead
);

// 獲取未讀公告數量
router.get('/unread-count', 
  authMiddleware, 
  NoticeController.getUnreadCount
);

module.exports = router;