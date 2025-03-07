// 位置：backend/middleware/validationMiddleware.js
const validator = require('validator');

const ValidationMiddleware = {
  // 註冊驗證
  validateRegistration(req, res, next) {
    const { username, email, password } = req.body;

    // 檢查必填欄位
    if (!username || !email || !password) {
      return res.status(400).json({ message: '請填寫所有必要欄位' });
    }

    // 驗證使用者名稱
    if (username.length < 2 || username.length > 50) {
      return res.status(400).json({ message: '使用者名稱長度必須在2-50字元之間' });
    }

    // 驗證電子郵件
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: '無效的電子郵件格式' });
    }

    // 驗證密碼強度
    if (!validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    })) {
      return res.status(400).json({ 
        message: '密碼必須至少8個字元，包含大小寫字母、數字和特殊符號' 
      });
    }

    next();
  },

  // 登入驗證
  validateLogin(req, res, next) {
    const { email, password } = req.body;

    // 檢查必填欄位
    if (!email || !password) {
      return res.status(400).json({ message: '請填寫電子郵件和密碼' });
    }

    // 驗證電子郵件
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: '無效的電子郵件格式' });
    }

    next();
  },

  // 帳號驗證
  validateUsername(req, res, next) {
    const { username } = req.body;

    // 檢查是否存在
    if (!username) {
      return res.status(400).json({ message: '請提供使用者帳號' });
    }

    // 檢查長度 6-20 字元
    if (username.length < 6 || username.length > 20) {
      return res.status(400).json({ message: '使用者帳號長度必須在6-20字元之間' });
    }

    // 只允許英文、數字、底線
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ message: '使用者帳號只能包含英文字母、數字和底線' });
    }

    next();
  },

  // 工作日誌驗證
  validateWorkLog(req, res, next) {
    const { location, crop, startTime, endTime } = req.body;

    // 檢查必填欄位
    if (!location || !crop || !startTime || !endTime) {
      return res.status(400).json({ message: '請填寫所有必要欄位' });
    }

    // 驗證時間格式
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ message: '無效的時間格式' });
    }

    // 驗證開始時間不能晚於結束時間
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    if (start >= end) {
      return res.status(400).json({ message: '開始時間必須早於結束時間' });
    }

    next();
  }
};

module.exports = ValidationMiddleware;