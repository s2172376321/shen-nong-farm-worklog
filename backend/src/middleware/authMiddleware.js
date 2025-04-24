const jwt = require('jsonwebtoken');
const db = require('../config/database');

// 驗證 JWT 令牌
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: '未提供認證令牌' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // 從資料庫中查找用戶
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await db.query(query, [decoded.id]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: '用戶不存在' 
      });
    }

    const user = result.rows[0];

    // 檢查用戶是否被禁用
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: '帳號已被禁用，請聯繫管理員'
      });
    }

    // 將用戶信息添加到請求對象中
    req.user = user;
    next();
  } catch (error) {
    console.error('認證錯誤:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: '無效的認證令牌' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: '認證過程中發生錯誤' 
    });
  }
};

// 檢查是否為管理員
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      success: false,
      message: '需要管理員權限' 
    });
  }
};

module.exports = {
  authenticate,
  isAdmin
}; 