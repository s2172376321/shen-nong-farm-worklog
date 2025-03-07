// 位置：backend/middleware/authMiddleware.js
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
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token 已過期' });
    }
    res.status(401).json({ message: '認證失敗' });
  }
};

// 管理員權限中間件
authMiddleware.adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '無權限訪問' });
  }
  next();
};

module.exports = authMiddleware;