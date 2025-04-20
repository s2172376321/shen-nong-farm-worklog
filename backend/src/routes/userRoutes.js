const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

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

// 檢查是否為管理員
const isAdmin = (req, res, next) => {
  try {
    console.log('檢查管理員權限:', {
      username: req.user.username,
      userInMap: users.has(req.user.username),
      user: users.get(req.user.username)
    });

    const user = users.get(req.user.username);
    if (!user || user.role !== 'admin') {
      console.log('權限檢查失敗:', {
        hasUser: !!user,
        role: user?.role
      });
      return res.status(403).json({ error: '需要管理員權限' });
    }
    next();
  } catch (error) {
    console.error('權限檢查錯誤:', error);
    res.status(500).json({ error: '權限檢查過程中發生錯誤' });
  }
};

// 獲取所有用戶
router.get('/', authenticateToken, isAdmin, (req, res) => {
  try {
    console.log('獲取用戶列表:', {
      totalUsers: users.size,
      requestUser: req.user.username
    });

    const userList = Array.from(users.values()).map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      department: user.department,
      position: user.position,
      role: user.role,
      createdAt: user.createdAt
    }));
    res.json(userList);
  } catch (error) {
    console.error('獲取用戶列表失敗:', error);
    res.status(500).json({ error: '獲取用戶列表失敗' });
  }
});

// 創建新用戶
router.post('/', authenticateToken, isAdmin, (req, res) => {
  try {
    const { username, password, email, name, department, position, role } = req.body;

    // 驗證必填字段
    if (!username || !password || !email) {
      return res.status(400).json({ error: '用戶名、密碼和電子郵件為必填項' });
    }

    // 檢查用戶名是否已存在
    if (users.has(username)) {
      return res.status(400).json({ error: '用戶名已存在' });
    }

    // 創建新用戶
    const newUser = {
      id: Date.now().toString(),
      username,
      password, // 注意：實際應用中應該加密存儲
      email,
      name,
      department,
      position,
      role: role || 'user',
      createdAt: new Date()
    };

    users.set(username, newUser);
    
    // 返回用戶信息（不包含密碼）
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ user: userWithoutPassword });
  } catch (error) {
    console.error('創建用戶失敗:', error);
    res.status(500).json({ error: '創建用戶失敗' });
  }
});

// 更新用戶信息
router.put('/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, department, position, role } = req.body;

    console.log('更新用戶請求:', {
      id,
      body: req.body
    });

    // 查找用戶
    const user = Array.from(users.values()).find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 更新用戶信息
    const updatedUser = {
      ...user,
      email: email || user.email,
      name: name || user.name,
      department: department || user.department,
      position: position || user.position,
      role: role || user.role
    };

    // 保存更新後的用戶信息
    users.set(user.username, updatedUser);

    console.log('用戶更新成功:', {
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role
    });

    // 返回更新後的用戶信息（不包含密碼）
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('更新用戶失敗:', error);
    res.status(500).json({ error: '更新用戶失敗' });
  }
});

// 刪除用戶
router.delete('/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // 查找用戶
    const user = Array.from(users.values()).find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 不能刪除自己
    if (user.username === req.user.username) {
      return res.status(400).json({ error: '不能刪除自己的帳號' });
    }

    users.delete(user.username);
    res.json({ message: '刪除用戶成功' });
  } catch (error) {
    console.error('刪除用戶失敗:', error);
    res.status(500).json({ error: '刪除用戶失敗' });
  }
});

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