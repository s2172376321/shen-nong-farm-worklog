const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const workLogRoutes = require('./workLogRoutes');
const adminRoutes = require('./admin');
const noticeRoutes = require('./noticeRoutes');
const attachmentRoutes = require('./attachmentRoutes');
const dashboardRoutes = require('./dashboardRoutes');

// 添加路由調試日誌
router.use((req, res, next) => {
  console.log('主路由收到請求:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl
  });
  next();
});

// 儀表板相關路由（放在最前面）
router.use('/dashboard', (req, res, next) => {
  console.log('儀表板路由中間件:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl
  });
  next();
}, dashboardRoutes);

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