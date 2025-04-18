const express = require('express');
const router = express.Router();
const AttachmentController = require('../controllers/attachmentController');
const authMiddleware = require('../middleware/authMiddleware');

// 上傳工單附件
router.post('/work-logs/:workLogId/attachments', 
  authMiddleware, 
  AttachmentController.uploadWorkLogAttachment
);

// 獲取工單附件列表
router.get('/work-logs/:workLogId/attachments', 
  authMiddleware, 
  AttachmentController.getWorkLogAttachments
);

// 下載工單附件
router.get('/attachments/:attachmentId/download', 
  authMiddleware, 
  AttachmentController.downloadWorkLogAttachment
);

// 刪除工單附件
router.delete('/attachments/:attachmentId', 
  authMiddleware, 
  AttachmentController.deleteWorkLogAttachment
);

module.exports = router; 