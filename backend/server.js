// 位置：backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload'); // 添加文件上傳中間件
const routes = require('./routes');
const db = require('./config/database'); // 引入資料庫連接

const app = express();
const PORT = process.env.PORT || 3002; // 確保使用正確端口

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

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});


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

// 文件上傳中間件
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制文件大小為5MB
  createParentPath: true, // 自動創建文件上傳目錄
  useTempFiles: false, // 不使用臨時文件，直接將文件存放在內存中
  debug: process.env.NODE_ENV !== 'production' // 在非生產環境下啟用調試
}));

// 回應 OPTIONS 請求
app.options('*', cors(corsOptions));

// 添加健康檢查路由
app.get('/api/health-check', (req, res) => {
  res.json({
    status: 'online',
    message: '伺服器連線正常',
    serverTime: new Date().toISOString()
  });
});

// 初始化數據庫架構
async function initDbSchema() {
  try {
    console.log('檢查並更新數據庫架構...');
    await db.query(`
      DO $$
      BEGIN
          -- 添加 location_code 欄位
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='work_logs' AND column_name='location_code') THEN
              ALTER TABLE work_logs ADD COLUMN location_code VARCHAR(50);
          END IF;

          -- 添加 position_code 欄位
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='work_logs' AND column_name='position_code') THEN
              ALTER TABLE work_logs ADD COLUMN position_code VARCHAR(50);
          END IF;

          -- 添加 position_name 欄位
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='work_logs' AND column_name='position_name') THEN
              ALTER TABLE work_logs ADD COLUMN position_name VARCHAR(100);
          END IF;

          -- 添加 work_category_code 欄位
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='work_logs' AND column_name='work_category_code') THEN
              ALTER TABLE work_logs ADD COLUMN work_category_code VARCHAR(50);
          END IF;

          -- 添加 work_category_name 欄位
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='work_logs' AND column_name='work_category_name') THEN
              ALTER TABLE work_logs ADD COLUMN work_category_name VARCHAR(100);
          END IF;

          -- 添加 product_id 欄位
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='work_logs' AND column_name='product_id') THEN
              ALTER TABLE work_logs ADD COLUMN product_id VARCHAR(50);
          END IF;

          -- 添加 product_name 欄位
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='work_logs' AND column_name='product_name') THEN
              ALTER TABLE work_logs ADD COLUMN product_name VARCHAR(100);
          END IF;

          -- 添加 product_quantity 欄位
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='work_logs' AND column_name='product_quantity') THEN
              ALTER TABLE work_logs ADD COLUMN product_quantity DECIMAL(10, 2) DEFAULT 0;
          END IF;
      END $$;
    `);
    console.log('數據庫架構檢查完成');
  } catch (error) {
    console.error('更新數據庫架構失敗:', error);
  }
}

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

// 先初始化數據庫架構，再啟動伺服器
initDbSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`伺服器已啟動，監聽端口 ${PORT}`);
    });
  })
  .catch(err => {
    console.error('啟動失敗:', err);
  });

module.exports = app;