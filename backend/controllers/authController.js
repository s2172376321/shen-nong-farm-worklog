// 位置：backend/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const googleAuthService = require('../config/googleAuth');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const config = require('../config');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 確保所有方法都被導出
const AuthController = {
  // 使用者註冊
  register: async (req, res) => {
    const { username, email, password, name, department, position } = req.body;

    try {
      // 檢查使用者帳號是否已存在
      const existUserByUsername = await User.findByUsername(username);
      if (existUserByUsername) {
        return res.status(400).json({ message: '此帳號已被使用' });
      }

      // 檢查電子郵件是否已存在
      const existUserByEmail = await User.findByEmail(email);
      if (existUserByEmail) {
        return res.status(400).json({ message: '此電子郵件已被註冊' });
      }

      // 密碼雜湊
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // 創建新使用者
      const newUser = await User.create(
        username,
        email,
        passwordHash,
        'user',
        name,
        department,
        position
      );

      res.status(201).json({ 
        message: '註冊成功',
        userId: newUser.id 
      });
    } catch (error) {
      console.error('註冊失敗:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 使用者登入
  login: async (req, res) => {
    try {
      console.log('Login request received:', {
        body: req.body,
        headers: req.headers
      });

      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '請提供用戶名和密碼'
        });
      }

      // 查詢用戶
      const user = await User.findByUsername(username);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: '用戶名或密碼錯誤'
        });
      }

      // 驗證密碼
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: '用戶名或密碼錯誤'
        });
      }

      // 生成 JWT token
      const token = jwt.sign(
        {
          id: user.id,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // 更新最後登入時間
      await User.updateLastLogin(user.id);

      console.log('Login successful for user:', user.username);

      // 返回用戶信息和 token
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', {
        message: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: '登錄過程中發生錯誤',
        error: error.message
      });
    }
  },
  
  // Google 登入
  googleLogin: async (req, res) => {
    try {
      const { credential, nonce } = req.body;
      
      if (!credential) {
        return res.status(400).json({ message: '缺少 Google 登入憑證' });
      }

      console.log('使用 credential 進行 Google 登入');
      const userInfo = await googleAuthService.verifyToken(credential, nonce);
      
      console.log('Google 用戶資訊獲取成功:', {
        email: userInfo.email,
        name: userInfo.name || '[未提供]'
      });
      
      // 檢查或創建使用者
      let user = await User.findByGoogleId(userInfo.googleId);
      if (!user) {
        user = await User.findByEmail(userInfo.email);
      }

      // 如果使用者不存在，創建新使用者
      if (!user) {
        console.log('創建新用戶');
        user = await User.createGoogleUser({
          username: userInfo.username || userInfo.email.split('@')[0],
          email: userInfo.email,
          googleId: userInfo.googleId,
          profileImage: userInfo.profileImage,
          name: userInfo.name
        });
      }

      // 生成 JWT token
      const token = jwt.sign(
        {
          id: user.id,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // 更新最後登入時間
      await User.updateLastLogin(user.id);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          name: user.name
        }
      });
    } catch (error) {
      console.error('Google 登入失敗:', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({ message: 'Google 登入失敗，請稍後再試' });
    }
  },

  // 修改密碼
  changePassword: async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
      // 驗證舊密碼
      const userQuery = await db.query(
        'SELECT password_hash FROM users WHERE id = $1', 
        [userId]
      );

      const user = userQuery.rows[0];
      const isMatch = await bcrypt.compare(oldPassword, user.password_hash);

      if (!isMatch) {
        return res.status(400).json({ message: '舊密碼不正確' });
      }

      // 雜湊新密碼
      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);

      // 更新密碼
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
      );

      res.json({ message: '密碼修改成功' });
    } catch (error) {
      console.error('修改密碼失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 使用者問題反饋
  submitFeedback: async (req, res) => {
    const { subject, content } = req.body;
    const userId = req.user.id;

    try {
      const query = `
        INSERT INTO user_feedbacks 
        (user_id, subject, content, created_at) 
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING id
      `;
      const values = [userId, subject, content];

      const result = await db.query(query, values);

      res.status(201).json({ 
        message: '問題反饋已提交',
        feedbackId: result.rows[0].id 
      });
    } catch (error) {
      console.error('提交問題反饋失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  }
};

module.exports = AuthController;