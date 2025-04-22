const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

// 使用內存存儲用戶信息
const users = new Map();

// 測試用路由，僅在開發環境中使用
if (process.env.NODE_ENV === 'development') {
  router.get('/test-hash', async (req, res) => {
    try {
      const password = '5ji6gj94';
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare(password, hash);
      const isValidWithStored = await bcrypt.compare(password, defaultAdmin.password);
      
      res.json({
        originalPassword: password,
        generatedHash: hash,
        storedHash: defaultAdmin.password,
        isValidWithNew: isValid,
        isValidWithStored: isValidWithStored
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// 預設管理員用戶
const defaultAdmin = {
  id: '7a44c896-46eb-4fec-9349-6d7bcac6714e',
  username: '1224',
  password: '$2b$10$HneE4en3BJPt8cbqJAmtrOnTx7vcB6F4uMo0qHy3xFFlr0sbwc4ym', // 密碼: 5ji6gj94
  role: 'admin',
  createdAt: new Date()
};

// 初始化預設管理員
users.set(defaultAdmin.username, defaultAdmin);

// 添加請求日誌中間件
router.use((req, res, next) => {
  console.log('Auth Route 請求:', {
    path: req.path,
    method: req.method,
    body: req.body,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
  next();
});

// 登入
router.post('/login', async (req, res) => {
  try {
    console.log('收到登入請求:', {
      body: req.body,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });

    const { username, password } = req.body;
    
    // 檢查用戶是否存在
    const user = users.get(username);
    if (!user) {
      console.log('用戶不存在:', username);
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('密碼驗證:', {
      username,
      isValid: isValidPassword
    });

    if (!isValidPassword) {
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    // 生成 token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('登入成功:', {
      username,
      role: user.role,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登入失敗:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: '登入失敗' });
  }
});

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
      role: 'user',
      createdAt: new Date()
    };

    // 保存用戶
    users.set(username, user);

    // 生成 token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('註冊失敗:', error);
    res.status(500).json({ error: '註冊失敗' });
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