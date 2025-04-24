const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// 所有管理員路由都需要認證和權限檢查
router.use(authenticateToken);
router.use(isAdmin);

// 獲取所有使用者
router.get('/users', AdminController.getAllUsers);

// 創建新使用者
router.post('/users', AdminController.createUser);

// 更新使用者
router.put('/users/:id', AdminController.updateUser);

// 刪除使用者
router.delete('/users/:id', AdminController.deleteUser);

// 獲取系統日誌
router.get('/logs', AdminController.getSystemLogs);

module.exports = router; 