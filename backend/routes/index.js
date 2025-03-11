// 位置：backend/routes/index.js
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const workLogRoutes = require('./workLogRoutes');
const noticeRoutes = require('./noticeRoutes');
const userRoutes = require('./userRoutes');
const statsRoutes = require('./statsRoutes');
const dataRoutes = require('./dataRoutes');  // 確保引入 dataRoutes

router.use('/auth', authRoutes);
router.use('/work-logs', workLogRoutes);
router.use('/notices', noticeRoutes);
router.use('/users', userRoutes);
router.use('/stats', statsRoutes);
router.use('/data', dataRoutes);  // 添加這一行

module.exports = router;