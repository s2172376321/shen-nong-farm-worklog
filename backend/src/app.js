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