const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// 使用內存存儲管理員信息
const admins = new Map();

// 檢查是否為管理員
const isAdmin = (req, res, next) => {
  const user = admins.get(req.user.username);
  if (!user) {
    return res.status(403).json({ error: '需要管理員權限' });
  }
  next();
};

// 獲取所有用戶
router.get('/users', authenticateToken, isAdmin, (req, res) => {
  try {
    const userList = Array.from(admins.values()).map(user => ({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt
    }));
    res.json(userList);
  } catch (error) {
    console.error('獲取用戶列表失敗:', error);
    res.status(500).json({ error: '獲取用戶列表失敗' });
  }
});

// 創建管理員
router.post('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;

    // 檢查用戶名是否已存在
    if (admins.has(username)) {
      return res.status(400).json({ error: '用戶名已存在' });
    }

    // 創建新管理員
    const admin = {
      id: Date.now().toString(),
      username,
      password, // 注意：實際應用中應該加密存儲
      createdAt: new Date()
    };

    // 保存管理員
    admins.set(username, admin);

    res.status(201).json({
      message: '創建管理員成功',
      user: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (error) {
    console.error('創建管理員失敗:', error);
    res.status(500).json({ error: '創建管理員失敗' });
  }
});

// 刪除管理員
router.delete('/users/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    const admin = Array.from(admins.values()).find(u => u.id === userId);

    if (!admin) {
      return res.status(404).json({ error: '管理員不存在' });
    }

    // 不能刪除自己
    if (admin.username === req.user.username) {
      return res.status(400).json({ error: '不能刪除自己' });
    }

    admins.delete(admin.username);
    res.json({ message: '刪除管理員成功' });
  } catch (error) {
    console.error('刪除管理員失敗:', error);
    res.status(500).json({ error: '刪除管理員失敗' });
  }
});

// 獲取系統統計信息
router.get('/stats', authenticateToken, isAdmin, (req, res) => {
  try {
    const stats = {
      totalUsers: admins.size,
      totalAdmins: Array.from(admins.values()).filter(u => u.isAdmin).length,
      createdAt: new Date()
    };
    res.json(stats);
  } catch (error) {
    console.error('獲取統計信息失敗:', error);
    res.status(500).json({ error: '獲取統計信息失敗' });
  }
});

module.exports = router; 