// 位置：backend/middleware/authMiddleware.js
// 改進管理員權限驗證

const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authMiddleware = async (req, res, next) => {
  // 從請求標頭取得 token
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: '未提供認證 Token' });
  }

  try {
    // 驗證 Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 確認使用者是否存在
    const userQuery = await db.query(
      'SELECT id, email, role FROM users WHERE id = $1', 
      [decoded.id]
    );

    const user = userQuery.rows[0];
    if (!user) {
      return res.status(401).json({ message: '無效的認證' });
    }

    // 將使用者資訊加入 request 物件
    req.user = user;
    
    // 記錄驗證成功，有助於調試
    console.log('用戶認證成功:', { 
      userId: user.id, 
      role: user.role,
      endpoint: req.originalUrl
    });
    
    next();
  } catch (error) {
    console.error('認證失敗:', { 
      error: error.message,
      errorName: error.name,
      endpoint: req.originalUrl
    });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token 已過期' });
    }
    res.status(401).json({ message: '認證失敗' });
  }
};

// 管理員權限中間件 - 改進版本
authMiddleware.adminOnly = (req, res, next) => {
  // 確保 req.user 存在
  if (!req.user) {
    console.error('管理員權限檢查失敗: 用戶對象不存在');
    return res.status(401).json({ message: '請先登入' });
  }
  
  // 檢查角色權限
  if (req.user.role !== 'admin') {
    console.error('管理員權限檢查失敗: 用戶角色不是管理員', {
      userId: req.user.id,
      actualRole: req.user.role,
      endpoint: req.originalUrl
    });
    return res.status(403).json({ message: '無管理員權限訪問' });
  }
  
  console.log('管理員權限驗證通過:', {
    userId: req.user.id,
    endpoint: req.originalUrl
  });
  
  next();
};

module.exports = authMiddleware;