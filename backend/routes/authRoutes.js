// 位置：backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { validateRegistration, validateLogin, validateUsername } = require('../middleware/validationMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const client = require('../utils/googleClient');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// 確保所有控制器方法都已定義
if (!AuthController.register) {
  console.error('AuthController.register 未定義');
}

if (!AuthController.login) {
  console.error('AuthController.login 未定義');
}

// 使用者註冊路由
router.post('/register', 
  validateUsername,  // 新增使用者帳號驗證
  validateRegistration, 
  (req, res) => {
    if (typeof AuthController.register !== 'function') {
      return res.status(500).json({ message: '伺服器配置錯誤：註冊控制器未定義' });
    }
    return AuthController.register(req, res);
  }
);

// 使用者登入路由
router.post('/login', 
  validateLogin, 
  (req, res) => {
    if (typeof AuthController.login !== 'function') {
      return res.status(500).json({ message: '伺服器配置錯誤：登入控制器未定義' });
    }
    return AuthController.login(req, res);
  }
);

// Google 登入路由
router.post('/google-login', 
  (req, res) => {
    console.log('收到 Google 登入請求:', {
      hasCredential: !!req.body.credential,
      hasClientId: !!req.body.clientId
    });
    
    if (typeof AuthController.googleLogin !== 'function') {
      return res.status(500).json({ message: '伺服器配置錯誤：Google 登入控制器未定義' });
    }
    return AuthController.googleLogin(req, res);
  }
);

// Google OAuth 回調處理
router.post('/google/callback', async (req, res) => {
  try {
    const { code, state, nonce } = req.body;
    
    console.log('收到 Google 回調:', {
      method: req.method,
      hasCode: !!code,
      hasState: !!state,
      hasNonce: !!nonce,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });

    // 驗證必要參數
    if (!code) {
      console.error('未收到授權碼');
      return res.status(400).json({
        success: false,
        message: '未提供授權碼'
      });
    }

    // 使用授權碼獲取令牌
    console.log('交換授權碼獲取令牌...', {
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      clientId: process.env.GOOGLE_CLIENT_ID ? '已設置' : '未設置',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ? '已設置' : '未設置',
      code: code ? '已提供' : '未提供'
    });

    let tokens;
    try {
      const tokenResponse = await client.getToken({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI
      });
      tokens = tokenResponse.tokens;
      console.log('成功獲取令牌');
    } catch (tokenError) {
      console.error('獲取令牌失敗:', {
        error: tokenError.message,
        code: tokenError.code,
        response: tokenError.response?.data
      });
      return res.status(400).json({
        success: false,
        message: '無法獲取 Google 令牌，請重新登入'
      });
    }
    
    // 驗證 ID Token
    console.log('驗證 ID Token...');
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
        nonce: nonce // 如果提供了 nonce 就驗證
      });
      console.log('ID Token 驗證成功');
    } catch (verifyError) {
      console.error('ID Token 驗證失敗:', {
        error: verifyError.message,
        code: verifyError.code
      });
      return res.status(400).json({
        success: false,
        message: '無法驗證 Google 身份，請重新登入'
      });
    }

    const payload = ticket.getPayload();
    const { email, sub: googleId, name, picture } = payload;

    console.log('用戶資訊獲取成功:', { 
      email,
      name: name || '[未提供]',
      timestamp: new Date().toISOString()
    });

    // 查找或創建用戶
    let user;
    try {
      // 先用 Google ID 查找
      user = await User.findByGoogleId(googleId);
      
      if (!user) {
        // 再用 email 查找
        user = await User.findByEmail(email);
        
        if (!user) {
          console.log('創建新用戶...');
          // 創建新用戶
          user = await User.create({
            username: email.split('@')[0],
            email,
            googleId,
            name: name || null,
            profileImageUrl: picture || null,
            role: 'user'
          });
        } else {
          console.log('更新現有用戶的 Google 資訊...');
          // 更新現有用戶的 Google ID
          user = await User.update(user.id, {
            googleId,
            name: name || user.name,
            profileImageUrl: picture || user.profile_image_url
          });
        }
      }
    } catch (dbError) {
      console.error('數據庫操作失敗:', {
        error: dbError.message,
        stack: dbError.stack
      });
      return res.status(500).json({
        success: false,
        message: '用戶數據處理失敗，請稍後再試'
      });
    }

    // 生成 JWT
    const token = jwt.sign(
      { 
        id: user.id,
        role: user.role,
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 更新最後登入時間
    try {
      await User.update(user.id, { lastLogin: new Date() });
    } catch (updateError) {
      console.warn('更新最後登入時間失敗:', updateError);
      // 不中斷流程，繼續返回用戶信息
    }

    console.log('登入成功，返回用戶資訊');
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        profile_image_url: user.profile_image_url
      }
    });

  } catch (error) {
    console.error('Google 登入錯誤:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // 根據錯誤類型返回適當的錯誤訊息
    if (error.message.includes('invalid_client')) {
      return res.status(400).json({
        success: false,
        message: 'Google OAuth 設定錯誤，請檢查 Client ID 和 Client Secret'
      });
    }

    if (error.message.includes('Invalid nonce')) {
      return res.status(400).json({
        success: false,
        message: '無效的 nonce 參數'
      });
    }

    if (error.message.includes('Token used too late')) {
      return res.status(400).json({
        success: false,
        message: '授權碼已過期，請重新登入'
      });
    }

    res.status(500).json({
      success: false,
      message: '處理 Google 登入時發生錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : '請稍後再試'
    });
  }
});

// 修改密碼路由
router.post('/change-password', 
  authMiddleware, 
  (req, res) => {
    if (typeof AuthController.changePassword !== 'function') {
      return res.status(500).json({ message: '伺服器配置錯誤：修改密碼控制器未定義' });
    }
    return AuthController.changePassword(req, res);
  }
);

// 提交問題反饋路由
router.post('/feedback', 
  authMiddleware, 
  (req, res) => {
    if (typeof AuthController.submitFeedback !== 'function') {
      return res.status(500).json({ message: '伺服器配置錯誤：問題反饋控制器未定義' });
    }
    return AuthController.submitFeedback(req, res);
  }
);


// 在後端添加測試端點 backend/routes/authRoutes.js
router.get('/test', authMiddleware, (req, res) => {
  res.json({
    status: 'authenticated',
    user: {
      id: req.user.id,
      role: req.user.role
    }
  });
});


module.exports = router;