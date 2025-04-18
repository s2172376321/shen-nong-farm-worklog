const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const config = require('../config');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

exports.googleCallback = async (req, res) => {
  try {
    console.log('Received Google callback request:', {
      body: req.body,
      headers: req.headers,
      url: req.url,
      method: req.method
    });

    const { code } = req.body;

    if (!code) {
      console.log('No authorization code provided');
      return res.status(400).json({
        success: false,
        message: '未提供授權碼'
      });
    }

    console.log('Exchanging authorization code for tokens...');
    
    // 使用授權碼獲取 tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    console.log('Verifying ID token...');
    
    // 獲取用戶信息
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    console.log('Looking up user:', email);
    
    // 查找或創建用戶
    let user = await User.findOne({ email });

    if (!user) {
      console.log('Creating new user for:', email);
      // 創建新用戶
      user = await User.create({
        email,
        username: email.split('@')[0],
        name,
        avatar: picture,
        googleId: payload.sub,
        role: 'user'
      });
    }

    console.log('Generating JWT token for user:', user._id);
    
    // 生成 JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful, sending response');
    
    // 返回用戶信息和 token
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Google callback error:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    res.status(500).json({
      success: false,
      message: '處理 Google 登入時發生錯誤',
      error: error.message
    });
  }
}; 