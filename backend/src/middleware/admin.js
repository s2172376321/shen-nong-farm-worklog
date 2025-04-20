// 管理員權限中間件
const adminOnly = (req, res, next) => {
  try {
    // 檢查用戶是否存在且已認證
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未登入'
      });
    }

    // 檢查用戶角色是否為管理員
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理員權限'
      });
    }

    // 如果是管理員，則繼續執行
    next();
  } catch (error) {
    console.error('管理員權限檢查失敗:', error);
    res.status(500).json({
      success: false,
      message: '權限檢查失敗'
    });
  }
};

module.exports = {
  adminOnly
}; 