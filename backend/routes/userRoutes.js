// 位置：backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateRegistration } = require('../middleware/validationMiddleware');

// 取得所有使用者（僅管理員）
router.get('/', 
  authMiddleware, 
  authMiddleware.adminOnly, 
  UserController.getAllUsers
);

// 創建新使用者（僅管理員）
router.post('/', 
  authMiddleware, 
  authMiddleware.adminOnly, 
  validateRegistration,
  UserController.createUser
);

// 更新使用者（僅管理員）
router.put('/:userId', 
  authMiddleware, 
  authMiddleware.adminOnly, 
  UserController.updateUser
);

// 刪除使用者（僅管理員）
router.delete('/:id', 
  authMiddleware, 
  authMiddleware.adminOnly, 
  UserController.deleteUser
);

// 檢查使用者名稱是否可用
router.get('/check-username/:username', UserController.checkUsernameAvailability);

// 綁定 Google 帳號（登入使用者）
router.post('/bind-google', 
  authMiddleware, 
  UserController.bindGoogleAccount
);

// 解除綁定 Google 帳號（登入使用者）
router.post('/unbind-google', 
  authMiddleware, 
  UserController.unbindGoogleAccount
);

module.exports = router;