// 位置：backend/routes/dataRoutes.js
const express = require('express');
const router = express.Router();
const DataController = require('../controllers/dataController');
const authMiddleware = require('../middleware/authMiddleware');

// 所有數據路由都需要認證
router.use(authMiddleware);

// 位置資料
router.get('/locations', DataController.getLocations);
router.get('/locations-by-area', DataController.getLocationsByArea);

// 工作類別資料
router.get('/work-categories', DataController.getWorkCategories);

// 產品資料
router.get('/products', DataController.getProducts);

module.exports = router;