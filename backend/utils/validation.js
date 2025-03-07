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
      minSymbols: 1
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