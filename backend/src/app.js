const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

// 基本的 CORS 配置
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  
  // 處理預檢請求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Body parser 中間件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API 路由
app.use('/api', routes);

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    status: err.status || 500
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服務器錯誤',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app; 