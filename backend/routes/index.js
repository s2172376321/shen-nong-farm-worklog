// 位置：backend/routes/index.js
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const workLogRoutes = require('./workLogRoutes');
const noticeRoutes = require('./noticeRoutes');
const userRoutes = require('./userRoutes');
const statsRoutes = require('./statsRoutes');
const dataRoutes = require('./dataRoutes');  // 確保引入 dataRoutes
const inventoryRoutes = require('./inventoryRoutes'); // 新增庫存路由
const authMiddleware = require('../middleware/authMiddleware');

// 管理员路由中间件
const adminAuth = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: '需要管理员权限' });
  }
};

// 基础路由
router.use('/auth', authRoutes);
router.use('/work-logs', workLogRoutes);
router.use('/notices', noticeRoutes);
router.use('/users', userRoutes);
router.use('/stats', statsRoutes);
router.use('/data', dataRoutes);  // 添加這一行
router.use('/inventory', inventoryRoutes); // 註冊庫存路由

// 管理员路由
router.get('/admin/dash', 
  authMiddleware,  // 先驗證 token
  authMiddleware.adminOnly,  // 再檢查管理員權限
  (req, res) => {
    res.json({
      status: 'success',
      data: {
        // 这里添加仪表盘数据
        totalUsers: 0,
        totalWorkLogs: 0,
        todayWorkLogs: 0
      }
    });
  }
);

router.get('/admin/noti', 
  authMiddleware,  // 先驗證 token
  authMiddleware.adminOnly,  // 再檢查管理員權限
  (req, res) => {
    res.json({
      status: 'success',
      data: {
        notifications: []
      }
    });
  }
);

module.exports = router;