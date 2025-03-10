// 位置：backend/routes/dataRoutes.js
const express = require('express');
const router = express.Router();
const DataController = require('../controllers/dataController');
const authMiddleware = require('../middleware/authMiddleware');

// 所有路由都需要認證
router.use(authMiddleware);

// 取得位置資料
router.get('/locations', DataController.getLocations);

// 取得按區域分組的位置資料
router.get('/locations-by-area', DataController.getLocationsByArea);

// 取得工作類別資料
router.get('/work-categories', DataController.getWorkCategories);

// 取得產品資料
router.get('/products', DataController.getProducts);

module.exports = router;