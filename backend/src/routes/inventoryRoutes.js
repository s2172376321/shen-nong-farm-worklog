const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const InventoryController = require('../controllers/inventoryController');
const { authenticateToken } = require('../middleware/auth');
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
router.post('/sync-from-products', authenticateToken, adminOnly, (req, res, next) => {
  InventoryController.syncFromProducts(req, res).catch(next);
});

// 獲取所有庫存項目
router.get('/', authenticateToken, (req, res, next) => {
  InventoryController.getAllItems(req, res).catch(next);
});

// 獲取所有庫存項目（別名）
router.get('/list', authenticateToken, (req, res, next) => {
  InventoryController.getAllItems(req, res).catch(next);
});

// 獲取低庫存警報
router.get('/low-stock', authenticateToken, (req, res, next) => {
  InventoryController.getLowStockAlerts(req, res).catch(next);
});

// 獲取統計數據
router.get('/statistics', authenticateToken, (req, res, next) => {
  InventoryController.getInventoryStats(req, res).catch(next);
});

// 獲取庫存警報
router.get('/alerts', authenticateToken, (req, res, next) => {
  InventoryController.getInventoryAlerts(req, res).catch(next);
});

// 創建庫存項目
router.post('/', authenticateToken, adminOnly, (req, res, next) => {
  InventoryController.createItem(req, res).catch(next);
});

// 匯入 CSV 數據
router.post('/import', authenticateToken, adminOnly, upload.single('file'), (req, res, next) => {
  InventoryController.importCSV(req, res).catch(next);
});

// 批量更新庫存項目
router.put('/batch', authenticateToken, adminOnly, (req, res, next) => {
  InventoryController.batchUpdate(req, res).catch(next);
});

// 獲取單個庫存項目
router.get('/:id', authenticateToken, (req, res, next) => {
  InventoryController.getItemById(req, res).catch(next);
});

// 更新庫存項目
router.put('/:id', authenticateToken, adminOnly, (req, res, next) => {
  InventoryController.updateItem(req, res).catch(next);
});

// 刪除庫存項目
router.delete('/:id', authenticateToken, adminOnly, (req, res, next) => {
  InventoryController.deleteItem(req, res).catch(next);
});

// 調整庫存數量
router.post('/:id/adjust', authenticateToken, adminOnly, (req, res, next) => {
  InventoryController.adjustQuantity(req, res).catch(next);
});

// 使用錯誤處理中間件
router.use(handleErrors);

module.exports = router; 