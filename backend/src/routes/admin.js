const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const db = require('../config/database');

// 獲取所有用戶
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, role, created_at FROM users');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('獲取用戶列表失敗:', error);
    res.status(500).json({ 
      success: false,
      message: '獲取用戶列表失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '請稍後再試'
    });
  }
});

// 其他管理員相關路由...
// ... existing code ...

module.exports = router; 