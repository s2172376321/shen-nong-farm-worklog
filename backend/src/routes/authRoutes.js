const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const AuthController = require('../controllers/authController');

// 註冊路由
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', AuthController.getCurrentUser);
router.put('/me', AuthController.updateCurrentUser);
router.put('/me/password', AuthController.updatePassword);

module.exports = router; 