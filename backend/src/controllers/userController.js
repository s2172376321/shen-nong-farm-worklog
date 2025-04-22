const { User, db } = require('../models');
const { Op } = require('sequelize');

const UserController = {
  // 獲取所有用戶
  async getAllUsers(req, res) {
    try {
      const users = await User.findAll({
        attributes: ['id', 'username', 'email', 'name', 'role', 'created_at'],
        order: [['created_at', 'DESC']]
      });
      res.json(users);
    } catch (error) {
      console.error('獲取用戶列表失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 創建新用戶
  async createUser(req, res) {
    try {
      const { username, email, password, name, role } = req.body;

      // 檢查必要字段
      if (!username || !email || !password) {
        return res.status(400).json({ 
          message: '請提供必要的用戶信息' 
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
          message: '用戶名或郵箱已存在' 
        });
      }

      // 創建新用戶
      const user = await User.create({
        username,
        email,
        password, // 密碼會在 beforeCreate 鉤子中自動加密
        name,
        role: role || 'user'
      });

      // 返回用戶信息（不包含密碼）
      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at
      };

      res.status(201).json(userResponse);
    } catch (error) {
      console.error('創建用戶失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 更新用戶信息
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { username, email, password, name, role } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ message: '用戶不存在' });
      }

      // 更新用戶信息
      const updateData = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (password) updateData.password = password;
      if (name) updateData.name = name;
      if (role) updateData.role = role;

      await user.update(updateData);

      // 返回更新後的用戶信息
      const updatedUser = await User.findByPk(id, {
        attributes: ['id', 'username', 'email', 'name', 'role', 'created_at']
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('更新用戶失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 刪除用戶
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ message: '用戶不存在' });
      }

      await user.destroy();
      res.json({ message: '用戶已刪除' });
    } catch (error) {
      console.error('刪除用戶失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  }
};

module.exports = UserController; 