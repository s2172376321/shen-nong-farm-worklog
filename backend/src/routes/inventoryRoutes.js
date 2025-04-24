const express = require('express');
const router = express.Router();
const InventoryController = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/authMiddleware');

// 獲取所有庫存項目
router.get('/', authenticate, (req, res) => {
    InventoryController.getAllItems(req, res).catch(error => {
        console.error('處理獲取庫存項目請求時發生錯誤:', error);
        res.status(500).json({ message: '處理請求時發生錯誤' });
    });
});

// 獲取低庫存項目
router.get('/low-stock', authenticate, (req, res) => {
    InventoryController.getLowStockItems(req, res).catch(error => {
        console.error('處理獲取低庫存項目請求時發生錯誤:', error);
        res.status(500).json({ message: '處理請求時發生錯誤' });
    });
});

// 更新庫存項目
router.put('/:id', authenticate, (req, res) => {
    InventoryController.updateItem(req, res).catch(error => {
        console.error('處理更新庫存項目請求時發生錯誤:', error);
        res.status(500).json({ message: '處理請求時發生錯誤' });
    });
});

module.exports = router; 