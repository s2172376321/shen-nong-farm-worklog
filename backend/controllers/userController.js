// 位置：backend/controllers/userController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');

const UserController = {
  // 取得所有使用者
  async getAllUsers(req, res) {
    try {
      const query = `
        SELECT 
          id, 
          username, 
          email,
          name, 
          department, 
          position, 
          role, 
          is_active,
          google_id IS NOT NULL as is_google_linked,
          created_at 
        FROM users 
        ORDER BY created_at DESC
      `;
      const result = await db.query(query);
      
      res.json(result.rows);
    } catch (error) {
      console.error('取得使用者列表失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 創建新使用者
  async createUser(req, res) {
    const { 
      username, 
      password, 
      email,
      name, 
      department, 
      position, 
      role 
    } = req.body;

    try {
      // 檢查使用者帳號是否已存在
      const existUserQuery = await db.query(
        'SELECT * FROM users WHERE username = $1', 
        [username]
      );

      if (existUserQuery.rows.length > 0) {
        return res.status(400).json({ message: '此帳號已被使用' });
      }

      // 如果有提供 email，檢查 email 是否已存在
      if (email) {
        const existEmailQuery = await db.query(
          'SELECT * FROM users WHERE email = $1', 
          [email]
        );

        if (existEmailQuery.rows.length > 0) {
          return res.status(400).json({ message: '此電子郵件已被註冊' });
        }
      }

      // 密碼雜湊
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // 插入新使用者
      const insertQuery = `
        INSERT INTO users 
        (username, email, password_hash, name, department, position, role) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING id, username, email, name, department, position, role
      `;
      const values = [
        username, 
        email || null, 
        passwordHash, 
        name || null, 
        department || null, 
        position || null, 
        role || 'user'
      ];

      const result = await db.query(insertQuery, values);

      res.status(201).json({ 
        message: '使用者創建成功',
        user: result.rows[0]
      });
    } catch (error) {
      console.error('創建使用者失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 更新使用者
  async updateUser(req, res) {
    const { userId } = req.params;
    const { 
      username, 
      email,
      name, 
      department, 
      position, 
      role,
      is_active 
    } = req.body;

    try {
      // 如果要更新 email，檢查是否與其他使用者重複
      if (email) {
        const existEmailQuery = await db.query(
          'SELECT * FROM users WHERE email = $1 AND id != $2', 
          [email, userId]
        );

        if (existEmailQuery.rows.length > 0) {
          return res.status(400).json({ message: '此電子郵件已被其他使用者使用' });
        }
      }

      // 如果要更新 username，檢查是否與其他使用者重複
      if (username) {
        const existUsernameQuery = await db.query(
          'SELECT * FROM users WHERE username = $1 AND id != $2', 
          [username, userId]
        );

        if (existUsernameQuery.rows.length > 0) {
          return res.status(400).json({ message: '此帳號已被其他使用者使用' });
        }
      }

      const updateQuery = `
        UPDATE users 
        SET 
          username = COALESCE($1, username),
          email = COALESCE($2, email),
          name = COALESCE($3, name),
          department = COALESCE($4, department),
          position = COALESCE($5, position),
          role = COALESCE($6, role),
          is_active = COALESCE($7, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING id, username, email, name, department, position, role, is_active
      `;

      const values = [
        username, 
        email,
        name,
        department, 
        position, 
        role, 
        is_active, 
        userId
      ];

      const result = await db.query(updateQuery, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: '使用者不存在' });
      }

      res.json({
        message: '使用者資訊更新成功',
        user: result.rows[0]
      });
    } catch (error) {
      console.error('更新使用者失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 檢查使用者帳號可用性
  async checkUsernameAvailability(req, res) {
    const { username } = req.params;
    
    try {
      const query = 'SELECT COUNT(*) FROM users WHERE username = $1';
      const result = await db.query(query, [username]);
      
      const isAvailable = parseInt(result.rows[0].count) === 0;
      
      res.json({ available: isAvailable });
    } catch (error) {
      console.error('檢查使用者帳號可用性失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 綁定 Google 帳號
  async bindGoogleAccount(req, res) {
    const userId = req.user?.id;
    const { googleId, email } = req.body;

    console.log('收到 Google 帳號綁定請求:', {
      userId,
      googleId: googleId ? `${googleId.substring(0, 5)}...` : undefined, // 僅記錄部分ID，保護隱私
      email: email ? `${email.substring(0, 3)}...` : undefined // 僅記錄部分email，保護隱私
    });

    // 驗證輸入數據和用戶身份
    if (!userId) {
      console.error('Google帳號綁定失敗: 用戶未認證');
      return res.status(401).json({ message: '請先登入後再進行操作' });
    }

    if (!googleId || !email) {
      console.error('Google帳號綁定失敗: 參數不完整', { googleId: !!googleId, email: !!email });
      return res.status(400).json({ message: 'Google ID 和 Email 為必填項目' });
    }

    try {
      // 先檢查用戶是否存在
      const userCheckQuery = await db.query(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );

      if (userCheckQuery.rows.length === 0) {
        console.error('Google帳號綁定失敗: 用戶不存在', { userId });
        return res.status(404).json({ message: '使用者不存在' });
      }

      // 檢查 Google ID 是否已被其他帳號使用
      const existingGoogleQuery = await db.query(
        'SELECT id, username FROM users WHERE google_id = $1 AND id != $2', 
        [googleId, userId]
      );

      if (existingGoogleQuery.rows.length > 0) {
        console.error('Google帳號綁定失敗: Google ID已被使用', {
          existingUserId: existingGoogleQuery.rows[0].id
        });
        return res.status(400).json({ 
          message: 'Google 帳號已被其他使用者綁定',
          conflictUserId: existingGoogleQuery.rows[0].id
        });
      }

      // 更新使用者的 Google 資訊
      const updateQuery = `
        UPDATE users 
        SET 
          google_id = $1, 
          google_email = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, username, name, email, google_id, google_email, role
      `;

      console.log('執行資料庫更新...');
      const result = await db.query(updateQuery, [
        googleId, 
        email, 
        userId
      ]);

      if (result.rows.length === 0) {
        console.error('Google帳號綁定失敗: 資料庫更新未返回結果');
        return res.status(500).json({ message: '資料庫更新失敗' });
      }

      console.log('Google帳號綁定成功', { userId });
      res.json({
        message: 'Google 帳號綁定成功',
        user: {
          ...result.rows[0],
          google_id: result.rows[0].google_id ? true : false // 僅返回是否已綁定，不返回實際ID
        }
      });
    } catch (error) {
      console.error('綁定 Google 帳號失敗:', error);
      
      // 檢查資料庫錯誤
      if (error.code) {
        console.error('資料庫錯誤代碼:', error.code);
      }
      
      // 提供更友好的錯誤訊息
      res.status(500).json({ 
        message: '伺服器錯誤，請稍後再試',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  },

  // 刪除使用者
  async deleteUser(req, res) {
    const { userId } = req.params;

    try {
      const deleteQuery = 'DELETE FROM users WHERE id = $1 RETURNING id';
      const result = await db.query(deleteQuery, [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: '使用者不存在' });
      }

      res.json({ 
        message: '使用者刪除成功',
        userId: result.rows[0].id 
      });
    } catch (error) {
      console.error('刪除使用者失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  }
};

module.exports = UserController;