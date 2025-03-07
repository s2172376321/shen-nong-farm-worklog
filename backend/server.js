// 位置：backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 配置更寬鬆
const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://127.0.0.1:3000', 
    'http://127.0.0.1:3001'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// 中間件配置
app.use(cors(corsOptions));

// 安全中間件
app.use(helmet());

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 100 // 每個IP每15分鐘最多100次請求
});
app.use(limiter);

// 解析中間件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 回應 OPTIONS 請求
app.options('*', cors(corsOptions));

// 路由
app.use('/api', routes);

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: '伺服器發生未預期錯誤',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器已啟動，監聽端口 ${PORT}`);
});

module.exports = app;