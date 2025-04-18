require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./models');
const authRoutes = require('./routes/auth');

const app = express();

// 中間件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);

// 測試資料庫連接
testConnection();

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '伺服器內部錯誤' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`伺服器運行在端口 ${PORT}`);
}); 