const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const Attachment = require('../models/Attachment');

// 配置 multer 用於文件上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// 上傳工單附件
router.post('/work-logs/:workLogId/attachments', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '請選擇要上傳的文件' });
    }

    const attachment = new Attachment({
      workLogId: req.params.workLogId,
      filename: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: req.user.id
    });

    await attachment.save();

    res.status(201).json({
      message: '附件上傳成功',
      attachment
    });
  } catch (error) {
    console.error('上傳附件失敗:', error);
    res.status(500).json({ error: '上傳附件失敗' });
  }
});

// 獲取工單附件列表
router.get('/work-logs/:workLogId/attachments', authenticateToken, async (req, res) => {
  try {
    const workLogId = req.params.workLogId;
    
    const attachments = await Attachment.find({ workLogId })
      .populate('uploadedBy', 'username')
      .sort({ uploadedAt: -1 });

    res.json(attachments);
  } catch (error) {
    console.error('獲取附件列表失敗:', error);
    res.status(500).json({ error: '獲取附件列表失敗' });
  }
});

// 下載工單附件
router.get('/:attachmentId/download', authenticateToken, async (req, res) => {
  try {
    const attachmentId = req.params.attachmentId;
    
    const attachment = await Attachment.findById(attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: '附件不存在' });
    }

    const filePath = attachment.path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    res.download(filePath, attachment.filename);
  } catch (error) {
    console.error('下載附件失敗:', error);
    res.status(500).json({ error: '下載附件失敗' });
  }
});

// 刪除工單附件
router.delete('/:attachmentId', authenticateToken, async (req, res) => {
  try {
    const attachmentId = req.params.attachmentId;
    
    const attachment = await Attachment.findById(attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: '附件不存在' });
    }

    const filePath = attachment.path;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Attachment.findByIdAndDelete(attachmentId);

    res.json({ message: '附件刪除成功' });
  } catch (error) {
    console.error('刪除附件失敗:', error);
    res.status(500).json({ error: '刪除附件失敗' });
  }
});

module.exports = router; 