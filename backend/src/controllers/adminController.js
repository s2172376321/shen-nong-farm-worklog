const User = require('../models/User');
const WorkLog = require('../models/WorkLog');
const { createLog } = require('../utils/logger');

const AdminController = {
    // 獲取所有使用者
    async getAllUsers(req, res) {
        try {
            const users = await User.find().select('-password');
            res.json(users);
        } catch (error) {
            createLog('error', `獲取使用者列表失敗: ${error.message}`);
            res.status(500).json({ message: '獲取使用者列表失敗' });
        }
    },

    // 創建新使用者
    async createUser(req, res) {
        try {
            const { username, password, role, name } = req.body;
            const user = new User({ username, password, role, name });
            await user.save();
            createLog('info', `管理員創建新使用者: ${username}`);
            res.status(201).json({ message: '使用者創建成功' });
        } catch (error) {
            createLog('error', `創建使用者失敗: ${error.message}`);
            res.status(500).json({ message: '創建使用者失敗' });
        }
    },

    // 更新使用者
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { name, role, password } = req.body;
            
            const updateData = { name, role };
            if (password) {
                updateData.password = password;
            }

            const user = await User.findByIdAndUpdate(id, updateData, { new: true });
            if (!user) {
                return res.status(404).json({ message: '使用者不存在' });
            }
            createLog('info', `管理員更新使用者: ${user.username}`);
            res.json({ message: '使用者更新成功' });
        } catch (error) {
            createLog('error', `更新使用者失敗: ${error.message}`);
            res.status(500).json({ message: '更新使用者失敗' });
        }
    },

    // 刪除使用者
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findByIdAndDelete(id);
            if (!user) {
                return res.status(404).json({ message: '使用者不存在' });
            }
            createLog('info', `管理員刪除使用者: ${user.username}`);
            res.json({ message: '使用者刪除成功' });
        } catch (error) {
            createLog('error', `刪除使用者失敗: ${error.message}`);
            res.status(500).json({ message: '刪除使用者失敗' });
        }
    },

    // 獲取系統日誌
    async getSystemLogs(req, res) {
        try {
            const logs = await WorkLog.find()
                .sort({ createdAt: -1 })
                .limit(100);
            res.json(logs);
        } catch (error) {
            createLog('error', `獲取系統日誌失敗: ${error.message}`);
            res.status(500).json({ message: '獲取系統日誌失敗' });
        }
    }
};

module.exports = AdminController; 