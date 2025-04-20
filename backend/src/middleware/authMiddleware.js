const jwt = require('jsonwebtoken');

// 使用內存存儲用戶
const users = new Map();

// 初始化測試用戶
const initializeTestUsers = () => {
  const adminUser = {
    id: '1',
    username: '1224',
    email: 's217237632@gmail.com',
    is_admin: true,
    role: 'admin',
    created_at: new Date()
  };
  users.set(adminUser.username, adminUser); // 使用 username 作為 key
  console.log('初始化測試用戶完成:', adminUser);
};

// 初始化測試用戶
initializeTestUsers();

// 處理用戶登入
const handleUser = (decoded) => {
  console.log('處理用戶登入:', decoded);
  
  // 檢查是否已存在該用戶
  let user = users.get(decoded.username);
  
  if (!user) {
    // 創建新用戶
    user = {
      id: decoded.id || String(Date.now()),
      username: decoded.username,
      email: decoded.email || `${decoded.username}@example.com`,
      is_admin: decoded.role === 'admin',
      role: decoded.role || 'user',
      created_at: new Date()
    };
    users.set(user.username, user);
    console.log('創建新用戶:', user);
  } else {
    console.log('找到現有用戶:', user);
  }
  
  return user;
};

const authMiddleware = async (req, res, next) => {
  try {
    // 從請求頭獲取 token
    const authHeader = req.headers.authorization;
    console.log('Auth Header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid auth header found');
      return res.status(401).json({ error: '未提供認證令牌' });
    }

    // 提取 token
    const token = authHeader.split(' ')[1];
    console.log('Extracted token:', token.substring(0, 20) + '...');
    
    // 獲取 JWT_SECRET
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    console.log('Using JWT secret');
    
    try {
      // 驗證 token
      console.log('Attempting to verify token...');
      const decoded = jwt.verify(token, secret);
      console.log('Token verified successfully:', decoded);
      
      // 處理用戶信息
      const user = handleUser(decoded);

      if (!user) {
        console.log('無法處理用戶信息:', decoded);
        return res.status(401).json({ error: '無效的用戶' });
      }

      // 將用戶信息添加到請求對象
      req.user = user;
      console.log('User attached to request:', { 
        id: req.user.id, 
        username: req.user.username,
        email: req.user.email,
        is_admin: req.user.is_admin,
        role: req.user.role
      });
      
      next();
    } catch (verifyError) {
      console.error('Token verification failed:', {
        error: verifyError.message,
        name: verifyError.name,
        stack: verifyError.stack
      });
      throw verifyError;
    }
  } catch (error) {
    console.error('認證失敗:', {
      error: error.message,
      name: error.name,
      stack: error.stack
    });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: '無效的認證令牌',
        details: error.message
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: '認證令牌已過期',
        details: error.message
      });
    }
    
    res.status(500).json({ 
      error: '認證過程中發生錯誤',
      details: error.message
    });
  }
};

// 管理員權限檢查中間件
const adminOnly = async (req, res, next) => {
  try {
    console.log('檢查管理員權限:', {
      user: req.user,
      is_admin: req.user?.is_admin,
      role: req.user?.role
    });

    if (!req.user) {
      console.log('未經過身份驗證');
      return res.status(401).json({ error: '未經過身份驗證' });
    }

    if (!req.user.is_admin && req.user.role !== 'admin') {
      console.log('用戶不是管理員:', req.user.username);
      return res.status(403).json({ error: '需要管理員權限' });
    }

    console.log('管理員權限驗證通過:', req.user.username);
    next();
  } catch (error) {
    console.error('管理員權限檢查失敗:', error);
    res.status(500).json({ error: '權限檢查過程中發生錯誤' });
  }
};

module.exports = {
  authenticate: authMiddleware,
  adminOnly
}; 