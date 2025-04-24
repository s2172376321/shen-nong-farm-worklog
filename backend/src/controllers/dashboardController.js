const db = require('../config/database');
const { createLog } = require('../utils/logger');

const DashboardController = {
    async getStats(req, res) {
        try {
            // 獲取總用戶數
            const usersQuery = 'SELECT COUNT(*) FROM users';
            const usersResult = await db.query(usersQuery);
            const totalUsers = parseInt(usersResult.rows[0].count);

            // 獲取總公告數
            const noticesQuery = 'SELECT COUNT(*) FROM notices';
            const noticesResult = await db.query(noticesQuery);
            const totalNotices = parseInt(noticesResult.rows[0].count);

            // 獲取總庫存項目數
            const inventoryQuery = 'SELECT COUNT(*) FROM inventory';
            const inventoryResult = await db.query(inventoryQuery);
            const totalInventory = parseInt(inventoryResult.rows[0].count);

            // 獲取低庫存項目數
            const lowStockQuery = 'SELECT COUNT(*) FROM inventory WHERE quantity <= min_quantity';
            const lowStockResult = await db.query(lowStockQuery);
            const lowStockItems = parseInt(lowStockResult.rows[0].count);

            res.json({
                totalUsers,
                totalNotices,
                totalInventory,
                lowStockItems
            });
        } catch (error) {
            createLog('error', `獲取儀表板統計數據失敗: ${error.message}`);
            res.status(500).json({ message: '獲取儀表板統計數據失敗' });
        }
    }
};

module.exports = DashboardController; 