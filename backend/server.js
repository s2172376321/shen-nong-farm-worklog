// 位置：backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// 解析中間件 - 放在最前面
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 配置 - 放在 helmet 之前，並使用更寬鬆的設置
app.use(cors({
  origin: true, // 允許所有來源請求，或使用以下數組設置
  // origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 快取 CORS 預檢結果，減少 OPTIONS 請求
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// 特別處理 OPTIONS 請求
app.options('*', cors());

// 安全中間件 - 放在 CORS 之後，並禁用部分可能與 CORS 衝突的設置
app.use(
  helmet({
    crossOriginResourcePolicy: false, // 允許跨域資源訪問
    crossOriginEmbedderPolicy: false // 允許跨域嵌入
  })
);

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 100, // 每個IP每15分鐘最多100次請求
  standardHeaders: true, // 返回標準的 RateLimit headers
  legacyHeaders: false, // 禁用 X-RateLimit headers
});
app.use(limiter);

// 調試路由 - 用於確認服務器正常運行
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '伺服器運行正常', timestamp: new Date().toISOString() });
});

// 主要路由
app.use('/api', routes);

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('服務器錯誤:', err.stack);
  res.status(500).json({ 
    message: '伺服器發生未預期錯誤',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器已啟動，監聽端口 ${PORT}`);
  console.log(`API 可訪問於: http://localhost:${PORT}/api`);
});

module.exports = app;