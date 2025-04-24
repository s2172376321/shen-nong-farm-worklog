const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// 獲取所有用戶（需要管理員權限）
router.get('/', authenticateToken, isAdmin, UserController.getAllUsers);

// 創建新用戶（需要管理員權限）
router.post('/', authenticateToken, isAdmin, UserController.createUser);

// 更新用戶信息（需要管理員權限）
router.put('/:id', authenticateToken, isAdmin, UserController.updateUser);

// 刪除用戶（需要管理員權限）
router.delete('/:id', authenticateToken, isAdmin, UserController.deleteUser);

// 獲取當前用戶信息
router.get('/me', authenticateToken, async (req, res) => {
  try {
    console.log('獲取當前用戶信息:', {
      user: req.user
    });

    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      department: req.user.department,
      position: req.user.position
    });
  } catch (error) {
    console.error('獲取當前用戶信息失敗:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: '獲取用戶信息失敗',
      message: error.message 
    });
  }
});

module.exports = router; 