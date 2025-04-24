// 錯誤處理中間件
const errorHandler = (err, req, res, next) => {
  console.error('錯誤處理中間件:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: req.user ? { id: req.user.id, role: req.user.role } : '未認證用戶'
  });

  // 處理 Sequelize 錯誤
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: '資料驗證錯誤',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // 處理 JWT 錯誤
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '無效的令牌'
    });
  }

  // 處理 JWT 過期錯誤
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '令牌已過期'
    });
  }

  // 處理其他錯誤
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '伺服器錯誤',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
};

module.exports = errorHandler; 