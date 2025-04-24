const express = require('express');
const router = express.Router();

// 引入各個路由模組
const authRoutes = require('./authRoutes');
const workLogRoutes = require('./workLogRoutes');
const adminRoutes = require('./adminRoutes');
const noticeRoutes = require('./noticeRoutes');
const statsRoutes = require('./statsRoutes');
const attachmentRoutes = require('./attachmentRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const inventoryRoutes = require('./inventoryRoutes');

// 註冊路由
router.use('/auth', authRoutes);
router.use('/work-logs', workLogRoutes);
router.use('/admin', adminRoutes);
router.use('/notices', noticeRoutes);
router.use('/stats', statsRoutes);
router.use('/attachments', attachmentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/inventory', inventoryRoutes);

// 404 處理
router.use((req, res) => {
    res.status(404).json({ message: '找不到請求的資源' });
});

module.exports = router; 