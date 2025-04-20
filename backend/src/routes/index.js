const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const noticesRoutes = require('./notices');
const workLogRoutes = require('./workLogRoutes');
const inventoryRoutes = require('./inventoryRoutes');

// 註冊認證路由
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/notices', noticesRoutes);
router.use('/work-logs', workLogRoutes);
router.use('/inventory', inventoryRoutes);

module.exports = router; 