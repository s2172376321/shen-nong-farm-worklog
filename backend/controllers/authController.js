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
    const { username, password } = req.body;
  
    console.log('登入嘗試:', { 
      username, 
      passwordLength: password ? password.length : 'N/A'
    });
  
    try {
      // 查找使用者 - 支援使用帳號或電子郵件登入
      const userQuery = await db.query(
        'SELECT * FROM users WHERE username = $1 OR email = $1', 
        [username]
      );
  
      const user = userQuery.rows[0];
      
      console.log('使用者查詢結果:', { 
        userFound: !!user,
        username: user ? user.username : null
      });
  
      if (!user) {
        console.log('使用者不存在');
        return res.status(401).json({ message: '無效的帳號或密碼' });
      }
  
      // 驗證密碼
      const isMatch = await bcrypt.compare(password, user.password_hash);
      
      console.log('密碼比對結果:', {
        isMatch,
        storedHashLength: user.password_hash ? user.password_hash.length : 'N/A'
      });
  
      if (!isMatch) {
        return res.status(401).json({ message: '無效的帳號或密碼' });
      }
  
      // 生成 JWT
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'fallback_secret', 
        { expiresIn: '24h' }
      );
  
      // 修改返回資訊，加入 google_id 和 google_email
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          department: user.department,
          position: user.position,
          role: user.role,
          google_id: user.google_id,
          google_email: user.google_email
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
  
  // Google 登入 - 更新為支援 credential
  googleLogin: async (req, res) => {
    try {
      // 從請求中取得 credential
      const { credential } = req.body;
      
      if (!credential) {
        return res.status(400).json({ message: '缺少 Google 登入憑證' });
      }

      console.log('使用 credential 進行 Google 登入');
      const userInfo = await googleAuthService.verifyToken(credential);
      
      console.log('Google 用戶資訊獲取成功:', {
        email: userInfo.email,
        name: userInfo.name || '[未提供]'
      });
      
      // 檢查或創建使用者
      let userQuery = await db.query(
        'SELECT * FROM users WHERE google_id = $1 OR email = $2', 
        [userInfo.googleId, userInfo.email]
      );

      let user = userQuery.rows[0];

      // 如果使用者不存在，創建新使用者
      if (!user) {
        console.log('創建新用戶');
        const insertQuery = `
          INSERT INTO users 
          (username, email, google_id, role, profile_image_url, name, google_email) 
          VALUES ($1, $2, $3, $4, $5, $6, $7) 
          RETURNING *
        `;
        const values = [
          userInfo.username || userInfo.email.split('@')[0], 
          userInfo.email, 
          userInfo.googleId, 
          'user',
          userInfo.profileImage,
          userInfo.name || null,
          userInfo.email
        ];

        const result = await db.query(insertQuery, values);
        user = result.rows[0];
      } else if (!user.google_id) {
        console.log('更新現有用戶的 Google 資訊');
        // 如果使用者存在但尚未綁定Google，更新Google資訊
        await db.query(
          'UPDATE users SET google_id = $1, google_email = $2, profile_image_url = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
          [userInfo.googleId, userInfo.email, userInfo.profileImage, user.id]
        );
        
        // 重新取得完整使用者資訊
        const refreshQuery = await db.query('SELECT * FROM users WHERE id = $1', [user.id]);
        user = refreshQuery.rows[0];
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
      
      console.log('登入成功，準備返回用戶資訊');
      
      res.json({
        token: jwtToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          google_id: user.google_id ? true : false,
          google_email: user.google_email
        }
      });
    } catch (error) {
      console.error('Google 登入失敗:', error);
      res.status(500).json({ 
        message: '登入失敗',
        error: error.message
      });
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