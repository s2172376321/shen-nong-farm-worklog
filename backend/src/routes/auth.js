const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { models } = require('../models');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Google OAuth 回調處理
router.all('/google/callback', async (req, res) => {
  try {
    // 根據請求方法獲取授權碼
    const code = req.method === 'GET' ? req.query.code : req.body.code;
    
    console.log('收到 Google 回調:', {
      method: req.method,
      code: code ? '存在' : '不存在',
      query: req.query,
      body: req.body
    });

    if (!code) {
      console.error('未收到授權碼');
      return res.redirect('http://localhost:3000/auth/google/error?error=missing_code');
    }

    // 使用授權碼獲取令牌
    const { tokens } = await client.getToken(code);
    console.log('成功獲取令牌');

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    console.log('令牌驗證成功');

    const payload = ticket.getPayload();
    const { email, sub: googleId, name } = payload;

    console.log('用戶資訊:', { email, name });

    // 查找或創建用戶
    let user = await models.User.findOne({ 
      where: { 
        [models.Sequelize.Op.or]: [
          { googleId: googleId },
          { email: email }
        ]
      } 
    });
    
    if (!user) {
      // 創建新用戶
      user = await models.User.create({
        username: email.split('@')[0],
        email,
        googleId,
        password: Math.random().toString(36).slice(-8), // 生成隨機密碼
        role: 'user'
      });
      console.log('創建新用戶');
    } else if (!user.googleId) {
      // 更新現有用戶的 Google ID
      user.googleId = googleId;
      await user.save();
      console.log('更新現有用戶的 Google ID');
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
    user.lastLogin = new Date();
    await user.save();

    // 重定向到前端成功頁面
    res.redirect(`http://localhost:3000/auth/google/success?token=${token}`);

  } catch (error) {
    console.error('Google 登入錯誤:', error);
    res.redirect(`http://localhost:3000/auth/google/error?error=${encodeURIComponent(error.message)}`);
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