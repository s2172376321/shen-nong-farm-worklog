const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const workLogRoutes = require('./workLogRoutes');
const adminRoutes = require('./admin');
const noticeRoutes = require('./noticeRoutes');
const attachmentRoutes = require('./attachmentRoutes');

// 認證相關路由
router.use('/auth', authRoutes);

// 工作日誌相關路由
router.use('/work-logs', workLogRoutes);

// 管理員相關路由
router.use('/admin', adminRoutes);

// 公告相關路由
router.use('/notices', noticeRoutes);

// 附件相關路由
router.use('/attachments', attachmentRoutes);

module.exports = router; 