const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const InventoryController = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

// 配置 multer，添加文件大小限制
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, 'inventory-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('只接受 CSV 文件'));
    }
  }
});

// 錯誤處理中間件
const handleErrors = (err, req, res, next) => {
  console.error('Inventory route error:', err);
  res.status(500).json({
    success: false,
    error: err.message || '處理請求時發生錯誤'
  });
};

// 同步產品到庫存
router.post('/sync-from-products', authenticate, adminOnly, async (req, res, next) => {
  try {
    await InventoryController.syncFromProducts(req, res);
  } catch (error) {
    next(error);
  }
});

// 匯入 CSV 數據
router.post('/import-csv', authenticate, adminOnly, upload.single('file'), (req, res, next) => {
  InventoryController.importCSV(req, res).catch(next);
});

// 獲取庫存警報（需要放在具體 ID 路由之前）
router.get('/alerts/low-stock', authenticate, async (req, res, next) => {
  try {
    await InventoryController.getInventoryAlerts(req, res);
  } catch (error) {
    next(error);
  }
});

// 獲取所有庫存項目
router.get('/', authenticate, InventoryController.getAllItems);

// 創建庫存項目
router.post('/', authenticate, adminOnly, InventoryController.createItem);

// 獲取單個庫存項目
router.get('/:id', authenticate, InventoryController.getItemById);

// 更新庫存項目
router.put('/:id', authenticate, adminOnly, InventoryController.updateItem);

// 刪除庫存項目
router.delete('/:id', authenticate, adminOnly, InventoryController.deleteItem);

// 調整庫存數量
router.patch('/:id/quantity', authenticate, InventoryController.adjustQuantity);

// 批量更新庫存項目
router.post('/batch-update', authenticate, adminOnly, InventoryController.batchUpdate);

// 報告和統計
router.get('/reports/low-stock', authenticate, InventoryController.getLowStockAlerts);
router.get('/reports/statistics', authenticate, InventoryController.getStatistics);

// 註冊錯誤處理中間件
router.use(handleErrors);

module.exports = router; 