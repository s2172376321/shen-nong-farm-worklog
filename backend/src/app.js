const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

// 配置 CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:5000',
    'http://localhost:5001',
    'http://localhost:5003'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
};

app.use(cors(corsOptions));

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