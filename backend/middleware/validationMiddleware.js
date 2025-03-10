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

  // 更新後的工作日誌驗證
  validateWorkLog(req, res, next) {
    const { 
      location_code, 
      position_code, 
      work_category_code,
      start_time, 
      end_time,
      harvest_quantity,
      product_id,
      product_quantity,
      work_category_name  // 可能需要用來檢查是否為"採收"類型
    } = req.body;

    // 檢查必填欄位
    if (!location_code || !position_code || !work_category_code || !start_time || !end_time) {
      return res.status(400).json({ message: '請填寫所有必要欄位' });
    }

    // 驗證時間格式
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return res.status(400).json({ message: '無效的時間格式' });
    }

    // 檢查工作時間範圍 (07:30-16:30)
    const minWorkTime = new Date(`2000-01-01T07:30:00`);
    const maxWorkTime = new Date(`2000-01-01T16:30:00`);
    const lunchStart = new Date(`2000-01-01T12:00:00`);
    const lunchEnd = new Date(`2000-01-01T13:00:00`);
    
    const startDate = new Date(`2000-01-01T${start_time}:00`);
    const endDate = new Date(`2000-01-01T${end_time}:00`);
    
    if (startDate < minWorkTime || endDate > maxWorkTime) {
      return res.status(400).json({ message: '工作時間必須在07:30至16:30之間' });
    }
    
    if (startDate >= endDate) {
      return res.status(400).json({ message: '開始時間必須早於結束時間' });
    }
    
    // 檢查是否與午休時間重疊
    if ((startDate < lunchStart && endDate > lunchStart) || 
        (startDate >= lunchStart && startDate < lunchEnd)) {
      return res.status(400).json({ message: '工作時間不能與午休時間(12:00-13:00)重疊' });
    }

    // 如果是採收類別，檢查是否有填寫採收數量
    if (work_category_name === '採收' && (!harvest_quantity || harvest_quantity <= 0)) {
      return res.status(400).json({ message: '採收類別必須填寫採收重量' });
    }

    // 如果已指定產品ID，檢查是否有填寫產品數量
    if (product_id && (!product_quantity || product_quantity <= 0)) {
      return res.status(400).json({ message: '選擇產品後必須填寫數量' });
    }

    next();
  },

  // 產品驗證
  validateProduct(req, res, next) {
    const { product_id, product_quantity } = req.body;

    if (!product_id) {
      return res.status(400).json({ message: '請選擇產品' });
    }

    if (!product_quantity || product_quantity <= 0) {
      return res.status(400).json({ message: '請填寫有效的產品數量' });
    }

    next();
  }
};

module.exports = ValidationMiddleware;