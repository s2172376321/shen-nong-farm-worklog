// 位置：backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { validateRegistration, validateLogin, validateUsername } = require('../middleware/validationMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

// 確保所有控制器方法都已定義
if (!AuthController.register) {
  console.error('AuthController.register 未定義');
}

if (!AuthController.login) {
  console.error('AuthController.login 未定義');
}

// 使用者註冊路由
router.post('/register', 
  validateUsername,  // 新增使用者帳號驗證
  validateRegistration, 
  (req, res) => {
    if (typeof AuthController.register !== 'function') {
      return res.status(500).json({ message: '伺服器配置錯誤：註冊控制器未定義' });
    }
    return AuthController.register(req, res);
  }
);

// 使用者登入路由
router.post('/login', 
  validateLogin, 
  (req, res) => {
    if (typeof AuthController.login !== 'function') {
      return res.status(500).json({ message: '伺服器配置錯誤：登入控制器未定義' });
    }
    return AuthController.login(req, res);
  }
);

// Google 登入路由
router.post('/google-login', 
  (req, res) => {
    if (typeof AuthController.googleLogin !== 'function') {
      return res.status(500).json({ message: '伺服器配置錯誤：Google 登入控制器未定義' });
    }
    return AuthController.googleLogin(req, res);
  }
);

// 修改密碼路由
router.post('/change-password', 
  authMiddleware, 
  (req, res) => {
    if (typeof AuthController.changePassword !== 'function') {
      return res.status(500).json({ message: '伺服器配置錯誤：修改密碼控制器未定義' });
    }
    return AuthController.changePassword(req, res);
  }
);

// 提交問題反饋路由
router.post('/feedback', 
  authMiddleware, 
  (req, res) => {
    if (typeof AuthController.submitFeedback !== 'function') {
      return res.status(500).json({ message: '伺服器配置錯誤：問題反饋控制器未定義' });
    }
    return AuthController.submitFeedback(req, res);
  }
);

module.exports = router;