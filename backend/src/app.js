const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 中間件
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 添加請求日誌中間件
app.use((req, res, next) => {
  console.log('收到請求:', {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: req.headers
  });
  next();
});

// API 路由
app.use('/api', routes);

// 錯誤處理
app.use(errorHandler);

// 404 處理
app.use((req, res) => {
  console.error(`路由未找到: ${req.method} ${req.url}`, {
    path: req.path,
    query: req.query,
    headers: req.headers
  });
  res.status(404).json({ 
    success: false,
    message: '路由未找到',
    path: req.url
  });
});

module.exports = app; 