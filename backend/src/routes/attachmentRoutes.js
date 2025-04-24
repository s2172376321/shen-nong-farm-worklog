const express = require('express');
const router = express.Router();
const AttachmentController = require('../controllers/attachmentController');
const { authenticateToken } = require('../middleware/auth');

// 所有路由都需要認證
router.use(authenticateToken);

// 上傳附件
router.post('/upload', AttachmentController.uploadAttachment);

// 下載附件
router.get('/:id/download', AttachmentController.downloadAttachment);

// 刪除附件
router.delete('/:id', AttachmentController.deleteAttachment);

// 獲取附件列表
router.get('/', AttachmentController.getAttachments);

module.exports = router; 