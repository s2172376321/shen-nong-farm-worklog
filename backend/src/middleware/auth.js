const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    // 從請求頭中獲取 token
    const authHeader = req.headers['authorization'];
    console.log('認證頭:', {
      hasAuthHeader: !!authHeader,
      authHeader: authHeader
    });

    const token = authHeader && authHeader.split(' ')[1];
    console.log('Token 解析:', {
      hasToken: !!token,
      tokenLength: token?.length
    });

    if (!token) {
      console.log('未提供認證令牌');
      return res.status(401).json({ error: '未提供認證令牌' });
    }

    // 驗證 token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.error('令牌驗證失敗:', {
          error: err.message,
          name: err.name
        });
        return res.status(403).json({ error: '無效的認證令牌' });
      }

      console.log('令牌驗證成功:', {
        username: user.username,
        role: user.role
      });

      // 將用戶信息添加到請求對象中
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('認證過程中發生錯誤:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: '認證過程中發生錯誤' });
  }
};

// 檢查管理員權限
const isAdmin = (req, res, next) => {
  try {
    console.log('檢查管理員權限:', {
      user: req.user,
      role: req.user?.role
    });

    if (!req.user) {
      return res.status(401).json({ error: '未經授權的訪問' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '需要管理員權限' });
    }

    next();
  } catch (error) {
    console.error('檢查管理員權限時發生錯誤:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: '檢查權限時發生錯誤' });
  }
};

module.exports = {
  authenticateToken,
  isAdmin
}; 