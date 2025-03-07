// 位置：backend/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const googleAuthService = require('../config/googleAuth');

// 確保所有方法都被導出
const AuthController = {
  // 使用者註冊
  register: async (req, res) => {
    const { username, email, password, name, department, position } = req.body;

    try {
      // 檢查使用者帳號是否已存在
      const existUserByUsername = await db.query(
        'SELECT * FROM users WHERE username = $1', 
        [username]
      );

      if (existUserByUsername.rows.length > 0) {
        return res.status(400).json({ message: '此帳號已被使用' });
      }

      // 檢查電子郵件是否已存在
      const existUserByEmail = await db.query(
        'SELECT * FROM users WHERE email = $1', 
        [email]
      );

      if (existUserByEmail.rows.length > 0) {
        return res.status(400).json({ message: '此電子郵件已被註冊' });
      }

      // 密碼雜湊
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // 插入新使用者
      const insertQuery = `
        INSERT INTO users 
        (username, email, password_hash, name, department, position, role) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING id
      `;
      const values = [
        username, 
        email, 
        passwordHash, 
        name || null,
        department || null, 
        position || null,
        'user'
      ];

      const result = await db.query(insertQuery, values);

      res.status(201).json({ 
        message: '註冊成功',
        userId: result.rows[0].id 
      });
    } catch (error) {
      console.error('註冊失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 使用者登入
  login: async (req, res) => {
    const { email, password } = req.body;

    console.log('登入嘗試:', { 
      email, 
      passwordLength: password ? password.length : 'N/A'
    });

    try {
      // 查找使用者
      const userQuery = await db.query(
        'SELECT * FROM users WHERE email = $1', 
        [email]
      );

      const user = userQuery.rows[0];
      
      console.log('使用者查詢結果:', { 
        userFound: !!user,
        userEmail: user ? user.email : null
      });

      if (!user) {
        console.log('使用者不存在');
        return res.status(401).json({ message: '無效的電子郵件或密碼' });
      }

      // 驗證密碼
      const isMatch = await bcrypt.compare(password, user.password_hash);
      
      console.log('密碼比對結果:', {
        isMatch,
        storedHashLength: user.password_hash ? user.password_hash.length : 'N/A'
      });

      if (!isMatch) {
        return res.status(401).json({ message: '無效的電子郵件或密碼' });
      }

      // 生成 JWT
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'fallback_secret', // 添加後備 secret
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          department: user.department,
          position: user.position,
          role: user.role
        }
      });
    } catch (error) {
      console.error('登入失敗:', {
        errorMessage: error.message,
        errorStack: error.stack
      });
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // Google 登入
  googleLogin: async (req, res) => {
    const { token } = req.body;

    try {
      // 驗證 Google Token
      const payload = await googleAuthService.verifyToken(token);

      // 檢查或創建使用者
      let userQuery = await db.query(
        'SELECT * FROM users WHERE google_id = $1 OR email = $2', 
        [payload.googleId, payload.email]
      );

      let user = userQuery.rows[0];

      // 如果使用者不存在，創建新使用者
      if (!user) {
        const insertQuery = `
          INSERT INTO users 
          (username, email, google_id, role, profile_image_url, name) 
          VALUES ($1, $2, $3, $4, $5, $6) 
          RETURNING id
        `;
        const values = [
          payload.username, 
          payload.email, 
          payload.googleId, 
          'user',
          payload.profileImage,
          payload.name || null
        ];

        const result = await db.query(insertQuery, values);
        user = { 
          id: result.rows[0].id, 
          email: payload.email, 
          username: payload.username,
          name: payload.name,
          role: 'user',
          profile_image_url: payload.profileImage
        };
      }

      // 生成 JWT
      const jwtToken = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '24h' }
      );

      res.json({
        token: jwtToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          department: user.department,
          position: user.position,
          role: user.role,
          profileImage: user.profile_image_url
        }
      });
    } catch (error) {
      console.error('Google 登入失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
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