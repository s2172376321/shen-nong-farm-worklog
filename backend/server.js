// 位置：backend/server.js
require('dotenv').config();
const express = require('express');
const http = require('http'); // 显式引入http模块
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');
const routes = require('./routes');
const db = require('./config/database'); // 引入资料库连接
const websocket = require('./websocket'); // 引入WebSocket模块

const app = express();
const PORT = process.env.PORT || 3002; // 确保使用正确端口

// 创建HTTP服务器（不再让express隐式创建）
const server = http.createServer(app);

// CORS 配置更宽松
const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://127.0.0.1:3000', 
    'http://127.0.0.1:3001',
    process.env.FRONTEND_URL // 添加生產環境的域名
  ].filter(Boolean), // 移除 undefined 值
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400 // 預取請求的快取時間（24小時）
};

// 應用 CORS 到所有請求
app.use(cors(corsOptions));

// 回應 OPTIONS 請求
app.options('*', cors(corsOptions));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// 中间件配置
app.use(express.json({ limit: '5mb' })); // 增加限制大小
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 每个IP每15分钟最多100次请求
});
app.use(limiter);

// 解析中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 文件上传中间件
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制文件大小为5MB
  createParentPath: true, // 自动创建文件上传目录
  useTempFiles: false, // 不使用临时文件，直接将文件存放在内存中
  debug: process.env.NODE_ENV !== 'production' // 在非生产环境下启用调试
}));

// 初始化数据库架构
async function initDbSchema() {
  try {
    await db.query(`
      DO $$
      BEGIN
          -- 檢查並添加必要欄位
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='work_logs' AND column_name='work_hours') THEN
              ALTER TABLE work_logs ADD COLUMN work_hours DECIMAL(5, 2) DEFAULT 0;
          END IF;

          -- 確保 created_at 有適當的索引
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_work_logs_created_at') THEN
              CREATE INDEX idx_work_logs_created_at ON work_logs(created_at);
          END IF;
      END $$;
    `);
  } catch (error) {
    console.error('更新資料庫結構失敗:', error);
  }
}

// 監控記憶體使用
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  console.log(`Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB / ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`);
}, 10000);

// 路由
app.use('/api', routes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: '伺服器发生未预期错误',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// 先初始化数据库架构，再启动服务器
initDbSchema()
  .then(() => {
    // 启动HTTP服务器
    server.listen(PORT, () => {
      console.log(`HTTP服务器已启动，监听端口 ${PORT}`);
      
      // 初始化WebSocket服务器
      const wss = websocket.initWebSocketServer(server);
      console.log(`WebSocket服务器已初始化`);
    });
  })
  .catch(err => {
    console.error('启动失败:', err);
  });

module.exports = app;