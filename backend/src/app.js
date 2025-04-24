const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fileUpload = require('express-fileupload');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const limiter = require('./middleware/rateLimit');

const app = express();

// CORS 配置
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// 中間件
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 限制檔案大小為 50MB
    abortOnLimit: true
}));

// 應用速率限制
app.use('/api', limiter);

// API 路由
app.use('/api', routes);

// 錯誤處理
app.use(errorHandler);

// 404 處理
app.use((req, res) => {
  console.error(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    path: req.url
  });
});

module.exports = app; 