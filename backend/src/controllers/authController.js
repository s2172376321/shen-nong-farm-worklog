const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const config = require('../config');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const db = require('../config/database');
const { createLog } = require('../utils/logger');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shen_nong_worklog',
  ssl: false
});

const AuthController = {
  // 註冊
  async register(req, res) {
    try {
      const { username, password, name } = req.body;

      // 檢查必填欄位
      if (!username || !password || !name) {
        return res.status(400).json({ message: '請填寫所有必填欄位' });
      }

      // 檢查用戶名是否已存在
      const checkQuery = 'SELECT id FROM users WHERE username = $1';
      const checkResult = await db.query(checkQuery, [username]);

      if (checkResult.rows.length > 0) {
        return res.status(400).json({ message: '用戶名已存在' });
      }

      // 加密密碼
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 創建用戶
      const query = `
        INSERT INTO users (username, password, name, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, name, role
      `;

      const values = [username, hashedPassword, name, 'user'];
      const result = await db.query(query, values);

      createLog('info', `新用戶註冊: ${username}`);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      createLog('error', `註冊失敗: ${error.message}`);
      res.status(500).json({ message: '註冊失敗' });
    }
  },

  // 登入
  async login(req, res) {
    try {
      console.log('登入請求:', {
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
      const userResult = await db.query(
        'SELECT id, username, password_hash, role, email, profile_image_url, is_active, last_login FROM users WHERE username = $1',
        [username]
      );

      const user = userResult.rows[0];

      if (!user) {
        return res.status(401).json({
          success: false,
          message: '用戶名或密碼錯誤'
        });
      }

      // 檢查用戶是否啟用
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: '帳號已被停用'
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
          username: user.username,
          role: user.role
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // 更新最後登入時間
      await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      console.log('登入成功:', user.username);

      // 返回用戶信息和 token
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          profileImageUrl: user.profile_image_url,
          lastLogin: user.last_login
        }
      });
    } catch (error) {
      console.error('登入錯誤:', {
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

  // 登出
  async logout(req, res) {
    try {
      // 在實際應用中，您可能需要將 token 加入黑名單
      createLog('info', `用戶登出: ${req.user.username}`);
      res.json({ message: '登出成功' });
    } catch (error) {
      createLog('error', `登出失敗: ${error.message}`);
      res.status(500).json({ message: '登出失敗' });
    }
  },

  // 獲取當前用戶資訊
  async getCurrentUser(req, res) {
    try {
      const query = 'SELECT id, username, name, role FROM users WHERE id = $1';
      const result = await db.query(query, [req.user.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: '用戶不存在' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      createLog('error', `獲取用戶資訊失敗: ${error.message}`);
      res.status(500).json({ message: '獲取用戶資訊失敗' });
    }
  },

  // 更新當前用戶資訊
  async updateCurrentUser(req, res) {
    try {
      const { name } = req.body;

      const query = `
        UPDATE users 
        SET name = $1
        WHERE id = $2
        RETURNING id, username, name, role
      `;

      const result = await db.query(query, [name, req.user.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: '用戶不存在' });
      }

      createLog('info', `更新用戶資訊: ${req.user.username}`);
      res.json(result.rows[0]);
    } catch (error) {
      createLog('error', `更新用戶資訊失敗: ${error.message}`);
      res.status(500).json({ message: '更新用戶資訊失敗' });
    }
  },

  // 更新密碼
  async updatePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      // 驗證當前密碼
      const userQuery = 'SELECT password FROM users WHERE id = $1';
      const userResult = await db.query(userQuery, [req.user.id]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: '用戶不存在' });
      }

      const isMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password);
      if (!isMatch) {
        return res.status(401).json({ message: '當前密碼錯誤' });
      }

      // 加密新密碼
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // 更新密碼
      const updateQuery = 'UPDATE users SET password = $1 WHERE id = $2';
      await db.query(updateQuery, [hashedPassword, req.user.id]);

      createLog('info', `更新密碼: ${req.user.username}`);
      res.json({ message: '密碼更新成功' });
    } catch (error) {
      createLog('error', `更新密碼失敗: ${error.message}`);
      res.status(500).json({ message: '更新密碼失敗' });
    }
  },

  googleCallback: async (req, res) => {
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

      console.log('Generating JWT token for user:', user.id);
      
      // 生成 JWT token
      const token = jwt.sign(
        { 
          id: user.id.toString(),
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
          id: user.id.toString(),
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
  },

  // 重置密碼
  async resetPassword(req, res) {
    try {
      console.log('收到重置密碼請求:', {
        body: req.body,
        headers: req.headers,
        timestamp: new Date().toISOString()
      });

      const { username, newPassword } = req.body;

      if (!username || !newPassword) {
        console.log('缺少必要參數:', { username, newPassword });
        return res.status(400).json({
          success: false,
          message: '請提供用戶名和新密碼'
        });
      }

      // 查詢用戶
      const userResult = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      console.log('查詢用戶結果:', {
        rows: userResult.rows,
        rowCount: userResult.rowCount
      });

      const user = userResult.rows[0];

      if (!user) {
        console.log('用戶不存在:', username);
        return res.status(404).json({
          success: false,
          message: '用戶不存在'
        });
      }

      // 生成新的密碼哈希
      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);

      console.log('生成新密碼哈希:', {
        salt,
        newPasswordHash
      });

      // 更新密碼
      const updateResult = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *',
        [newPasswordHash, user.id]
      );

      console.log('更新密碼結果:', {
        rows: updateResult.rows,
        rowCount: updateResult.rowCount
      });

      if (updateResult.rowCount === 0) {
        console.log('更新密碼失敗:', {
          userId: user.id,
          username
        });
        return res.status(500).json({
          success: false,
          message: '更新密碼失敗'
        });
      }

      console.log('重置密碼成功:', {
        userId: user.id,
        username,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: '密碼已重置'
      });
    } catch (error) {
      console.error('重置密碼失敗:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({
        success: false,
        message: '重置密碼失敗'
      });
    }
  }
};

module.exports = AuthController; 