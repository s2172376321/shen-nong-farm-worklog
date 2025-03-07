// 位置：backend/routes/index.js
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const workLogRoutes = require('./workLogRoutes');
const noticeRoutes = require('./noticeRoutes');
const userRoutes = require('./userRoutes');
const statsRoutes = require('./statsRoutes');

router.use('/auth', authRoutes);
router.use('/work-logs', workLogRoutes);
router.use('/notices', noticeRoutes);
router.use('/users', userRoutes);
router.use('/stats', statsRoutes);

module.exports = router;