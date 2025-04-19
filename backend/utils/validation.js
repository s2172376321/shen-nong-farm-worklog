// 位置：backend/utils/validation.js
const validator = require('validator');

const ValidationUtils = {
  // 驗證電子郵件
  isValidEmail(email) {
    return validator.isEmail(email);
  },

  // 驗證密碼強度
  isStrongPassword(password) {
    return validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
      returnScore: true
    });
  },

  // 清理和標準化輸入
  sanitizeInput(input) {
    return validator.trim(validator.escape(input));
  },

  // 驗證時間格式
  isValidTimeFormat(time) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  },

  // 驗證使用者名稱
  isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/;
    return usernameRegex.test(username);
  }
};

module.exports = ValidationUtils;

// 位置：backend/utils/errorHandler.js
class CustomError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || '伺服器發生未預期錯誤';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message
  });
};

module.exports = {
  CustomError,
  errorHandler
};

// Rate Limiting 工具
const rateLimit = {
  attempts: new Map(),
  
  // 檢查並記錄嘗試次數
  checkAttempts(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    
    // 清理過期的嘗試記錄
    const validAttempts = userAttempts.filter(
      timestamp => now - timestamp < windowMs
    );
    
    // 如果嘗試次數超過限制
    if (validAttempts.length >= maxAttempts) {
      return false;
    }
    
    // 記錄新的嘗試
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  },
  
  // 重置嘗試次數
  resetAttempts(key) {
    this.attempts.delete(key);
  }
};