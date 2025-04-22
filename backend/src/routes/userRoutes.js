const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// 使用內存存儲用戶信息
const users = new Map();

// 初始化管理員用戶
const initAdminUser = {
  id: '1',
  username: '1224',
  password: 'admin123', // 注意：實際應用中應該加密存儲
  email: 'sz172376321@gmail.com',
  name: '管理員',
  department: '管理部',
  position: '系統管理員',
  role: 'admin',
  createdAt: new Date()
};
users.set(initAdminUser.username, initAdminUser);

// 獲取所有用戶（需要管理員權限）
router.get('/', authenticateToken, isAdmin, UserController.getAllUsers);

// 創建新用戶（需要管理員權限）
router.post('/', authenticateToken, isAdmin, UserController.createUser);

// 更新用戶信息（需要管理員權限）
router.put('/:id', authenticateToken, isAdmin, UserController.updateUser);

// 刪除用戶（需要管理員權限）
router.delete('/:id', authenticateToken, isAdmin, UserController.deleteUser);

// 獲取當前用戶信息
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.username);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 返回用戶信息（不包含密碼）
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('獲取用戶信息失敗:', error);
    res.status(500).json({ error: '獲取用戶信息失敗' });
  }
});

module.exports = router; 