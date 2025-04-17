const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getLowStockItems,
  adjustInventoryQuantity,
  getInventoryItemByProductId,
  createInventoryCheckout,
  getInventoryCheckouts
} = require('../controllers/inventoryController');

// 獲取所有庫存項目
router.get('/', authenticateToken, getAllInventoryItems);

// 獲取低庫存項目
router.get('/low-stock', authenticateToken, getLowStockItems);

// 根據產品ID獲取庫存項目
router.get('/product/:productId', authenticateToken, getInventoryItemByProductId);

// 創建庫存領用記錄
router.post('/checkout', authenticateToken, createInventoryCheckout);

// 獲取庫存領用記錄
router.get('/checkouts', authenticateToken, getInventoryCheckouts);

// 獲取單個庫存項目
router.get('/:id', authenticateToken, getInventoryItemById);

// 創建新庫存項目
router.post('/', authenticateToken, createInventoryItem);

// 更新庫存項目
router.put('/:id', authenticateToken, updateInventoryItem);

// 刪除庫存項目
router.delete('/:id', authenticateToken, deleteInventoryItem);

// 調整庫存數量
router.post('/:id/adjust', authenticateToken, adjustInventoryQuantity);

module.exports = router; 