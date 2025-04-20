// 管理員權限中間件
const adminMiddleware = (req, res, next) => {
  // 檢查用戶是否存在
  if (!req.user) {
    return res.status(401).json({ error: '未登入' });
  }

  // 檢查用戶角色
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理員權限' });
  }

  next();
};

module.exports = adminMiddleware; 