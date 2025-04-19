const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// 創建 OAuth2 客戶端
const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI
});

// Google OAuth 回調處理
router.post('/google/callback', async (req, res) => {
  try {
    const { code, state, nonce } = req.body;
    
    console.log('收到 Google 回調:', {
      method: req.method,
      hasCode: !!code,
      hasState: !!state,
      hasNonce: !!nonce,
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

    if (!state) {
      console.error('未收到 state 參數');
      return res.status(400).json({
        success: false,
        message: '未提供 state 參數'
      });
    }

    if (!nonce) {
      console.error('未收到 nonce 參數');
      return res.status(400).json({
        success: false,
        message: '未提供 nonce 參數'
      });
    }

    // 使用授權碼獲取令牌
    console.log('交換授權碼獲取令牌...', {
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      clientId: process.env.GOOGLE_CLIENT_ID ? '已設置' : '未設置',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ? '已設置' : '未設置',
      code: code ? '已提供' : '未提供'
    });

    const { tokens } = await client.getToken({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI
    });
    
    // 驗證 ID Token
    console.log('驗證 ID Token...');
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
      nonce: nonce // 驗證 nonce
    });

    const payload = ticket.getPayload();
    const { email, sub: googleId, name, picture } = payload;

    console.log('用戶資訊獲取成功:', { 
      email,
      name: name || '[未提供]',
      timestamp: new Date().toISOString()
    });

    // 查找用戶
    let user = await User.findByGoogleId(googleId);
    
    if (!user) {
      // 檢查是否有使用相同郵箱的用戶
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
    await User.update(user.id, { lastLogin: new Date() });

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

// 一般登入路由
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await models.User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: '使用者不存在' });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: '密碼錯誤' });
    }

    const token = jwt.sign(
      { 
        id: user.id,
        role: user.role,
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    user.lastLogin = new Date();
    await user.save();

    res.json({ token });
  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router; 