const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 使用內存存儲用戶信息
const users = new Map();

// 註冊用戶
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 檢查用戶名是否已存在
    if (users.has(username)) {
      return res.status(400).json({ error: '用戶名已存在' });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    // 創建新用戶
    const user = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      createdAt: new Date()
    };

    // 保存用戶
    users.set(username, user);

    // 生成 token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: '註冊成功',
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('註冊失敗:', error);
    res.status(500).json({ error: '註冊失敗' });
  }
});

// 登入
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用戶
    const user = users.get(username);
    if (!user) {
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    // 生成 token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: '登入成功',
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('登入失敗:', error);
    res.status(500).json({ error: '登入失敗' });
  }
});

// 獲取當前用戶信息
router.get('/me', async (req, res) => {
  try {
    // 從請求頭中獲取 token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: '未提供認證令牌' });
    }

    // 驗證 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = users.get(decoded.username);

    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json({
      id: user.id,
      username: user.username
    });
  } catch (error) {
    console.error('獲取用戶信息失敗:', error);
    res.status(500).json({ error: '獲取用戶信息失敗' });
  }
});

module.exports = router; 