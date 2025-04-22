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

    // 驗證使用者名稱（4-20位英文字母和數字）
    const usernameRegex = /^[a-zA-Z0-9]{4,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ message: '使用者名稱必須是4-20位英文字母和數字' });
    }

    // 驗證電子郵件
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: '無效的電子郵件格式' });
    }

    // 驗證密碼長度
    if (password.length < 8) {
      return res.status(400).json({ 
        message: '密碼必須至少8個字元' 
      });
    }

    next();
  },

  // 登入驗證
  validateLogin(req, res, next) {
    const { username, password } = req.body;

    // 檢查必填欄位
    if (!username || !password) {
      return res.status(400).json({ message: '請填寫帳號和密碼' });
    }

    // 驗證使用者名稱（4-20位英文字母和數字）
    const usernameRegex = /^[a-zA-Z0-9]{4,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ message: '使用者名稱必須是4-20位英文字母和數字' });
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

    // 驗證使用者名稱（4-20位英文字母和數字）
    const usernameRegex = /^[a-zA-Z0-9]{4,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ message: '使用者名稱必須是4-20位英文字母和數字' });
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