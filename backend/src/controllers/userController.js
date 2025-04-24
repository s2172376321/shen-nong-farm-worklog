const { User } = require('../models');
const { Op } = require('sequelize');

const UserController = {
  // 獲取所有用戶
  async getAllUsers(req, res) {
    try {
      console.log('獲取所有用戶請求:', {
        user: req.user,
        role: req.user?.role
      });

      const users = await User.findAll({
        attributes: [
          'id', 
          'username', 
          'email', 
          'name', 
          'role', 
          'department', 
          'position', 
          'is_active',
          'last_login',
          'profile_image_url',
          'created_at',
          'updated_at'
        ],
        where: {
          is_active: true
        },
        order: [['created_at', 'DESC']]
      });

      console.log('成功獲取用戶列表:', {
        count: users.length
      });

      res.json(users);
    } catch (error) {
      console.error('獲取用戶列表失敗:', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        error: '獲取用戶列表失敗',
        message: error.message 
      });
    }
  },

  // 創建新用戶
  async createUser(req, res) {
    try {
      console.log('創建用戶請求:', {
        body: req.body,
        adminUser: req.user
      });

      const { username, email, password, name, role, department, position } = req.body;

      // 檢查必要字段
      if (!username || !email || !password || !name) {
        return res.status(400).json({ 
          error: '缺少必要的用戶信息',
          fields: ['username', 'email', 'password', 'name']
        });
      }

      // 檢查用戶名和郵箱是否已存在
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { username },
            { email }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({ 
          error: '用戶名或郵箱已存在' 
        });
      }

      // 創建新用戶
      const user = await User.create({
        username,
        email,
        password,
        name,
        role: role || 'user',
        department,
        position,
        is_active: true
      });

      console.log('用戶創建成功:', {
        id: user.id,
        username: user.username
      });

      // 返回用戶信息（不包含密碼）
      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        position: user.position,
        created_at: user.created_at
      };

      res.status(201).json(userResponse);
    } catch (error) {
      console.error('創建用戶失敗:', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        error: '創建用戶失敗',
        message: error.message 
      });
    }
  },

  // 更新用戶信息
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      console.log('更新用戶請求:', {
        userId: id,
        updates,
        adminUser: req.user
      });

      // 檢查用戶是否存在
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ 
          error: '用戶不存在' 
        });
      }

      // 如果要更新郵箱，檢查是否已被使用
      if (updates.email && updates.email !== user.email) {
        const existingEmail = await User.findOne({
          where: { email: updates.email }
        });
        if (existingEmail) {
          return res.status(400).json({ 
            error: '郵箱已被使用' 
          });
        }
      }

      // 如果要更新用戶名，檢查是否已被使用
      if (updates.username && updates.username !== user.username) {
        const existingUsername = await User.findOne({
          where: { username: updates.username }
        });
        if (existingUsername) {
          return res.status(400).json({ 
            error: '用戶名已被使用' 
          });
        }
      }

      // 更新用戶信息
      await user.update(updates);

      console.log('用戶更新成功:', {
        id: user.id,
        username: user.username
      });

      // 返回更新後的用戶信息
      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        position: user.position,
        is_active: user.is_active,
        updated_at: user.updated_at
      };

      res.json(userResponse);
    } catch (error) {
      console.error('更新用戶失敗:', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        error: '更新用戶失敗',
        message: error.message 
      });
    }
  },

  // 刪除用戶（軟刪除）
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      console.log('刪除用戶請求:', {
        userId: id,
        adminUser: req.user
      });

      // 檢查用戶是否存在
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ 
          error: '用戶不存在' 
        });
      }

      // 軟刪除用戶
      await user.update({ is_active: false });

      console.log('用戶刪除成功:', {
        id: user.id,
        username: user.username
      });

      res.json({ 
        message: '用戶已成功刪除' 
      });
    } catch (error) {
      console.error('刪除用戶失敗:', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        error: '刪除用戶失敗',
        message: error.message 
      });
    }
  }
};

module.exports = UserController; 