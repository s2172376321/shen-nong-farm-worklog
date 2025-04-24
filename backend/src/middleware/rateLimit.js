const rateLimit = require('express-rate-limit');

// 創建速率限制器
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 300, // 限制每個IP在15分鐘內最多300個請求
  standardHeaders: true, // 返回標準的速率限制頭部
  legacyHeaders: false, // 禁用舊的速率限制頭部
  message: {
    success: false,
    message: '請求過於頻繁，請稍後再試'
  },
  skip: (req) => {
    // 跳過OPTIONS請求
    return req.method === 'OPTIONS';
  }
});

module.exports = limiter; 