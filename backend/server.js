// 位置：backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const WebSocket = require('ws');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3002;  // 默認值改為3002

// 解析中間件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 配置
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.options('*', cors());

// 安全中間件
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 健康檢查路由
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok', message: '伺服器運行正常', timestamp: new Date().toISOString() });
});

// 主要API路由
app.use('/api', routes);

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('服務器錯誤:', err.stack);
  res.status(500).json({ 
    message: '伺服器發生未預期錯誤',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// 創建單一HTTP服務器
const server = http.createServer(app);

// 設置WebSocket服務器，掛載在同一個HTTP服務器上
const wss = new WebSocket.Server({ 
  server: server, 
  path: '/ws'
});

// WebSocket 事件處理
wss.on('connection', (ws) => {
  console.log('WebSocket 客戶端已連接');

  ws.on('message', (message) => {
    console.log('收到消息:', message);
    ws.send(JSON.stringify({ type: 'response', data: '已收到消息' }));
  });

  ws.on('close', () => {
    console.log('WebSocket 客戶端已斷開');
  });

  ws.send(JSON.stringify({ type: 'welcome', data: '已連接到 WebSocket 服務器' }));
});

// 只啟動一個服務器，同時處理HTTP和WebSocket請求
server.listen(PORT, () => {
  console.log(`服務器已啟動，監聽端口 ${PORT}`);
  console.log(`API 可訪問於: http://localhost:${PORT}/api`);
  console.log(`WebSocket 可訪問於: ws://localhost:${PORT}/ws`);
});

module.exports = app;