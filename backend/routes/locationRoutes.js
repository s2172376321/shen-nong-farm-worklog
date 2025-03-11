// 位置：backend/routes/locationRoutes.js
const express = require('express');
const router = express.Router();
const LocationController = require('../controllers/locationController');
const authMiddleware = require('../middleware/authMiddleware');

// 獲取所有位置
router.get('/', 
  authMiddleware, 
  LocationController.getAllLocations
);

module.exports = router;