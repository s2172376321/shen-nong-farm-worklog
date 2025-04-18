// 位置：backend/routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const InventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');

// 所有庫存路由都需要認證
router.use(authMiddleware);

// 獲取所有庫存項目
router.get('/', InventoryController.getAllItems);

// 獲取低庫存項目
router.get('/low-stock', InventoryController.getLowStockItems);

// 獲取庫存交易歷史
router.get('/transactions', InventoryController.getTransactionHistory);

// 透過產品ID獲取庫存項目
router.get('/product/:productId', InventoryController.getItemByProductId);

// 獲取單一庫存項目詳情
router.get('/:itemId', InventoryController.getItemDetails);

// 管理員權限路由
// 創建新庫存項目
router.post('/', 
  authMiddleware.adminOnly, 
  InventoryController.createItem
);

// 更新庫存項目
router.put('/:itemId',
  authMiddleware.adminOnly,
  InventoryController.updateItem
);

// 刪除庫存項目
router.delete('/:itemId',
  authMiddleware.adminOnly,
  InventoryController.deleteItem
);

// 調整庫存數量 (進貨、出貨、直接調整)
router.post('/:itemId/adjust',
  InventoryController.adjustQuantity
);

// 從工作日誌同步庫存消耗
router.post('/sync-from-worklog/:workLogId', 
  authMiddleware.adminOnly, 
  InventoryController.syncFromWorkLog
);

// 批量更新产品從產品列表
router.post('/sync-from-products', 
  authMiddleware.adminOnly, 
  InventoryController.syncFromProductList
);

module.exports = router;