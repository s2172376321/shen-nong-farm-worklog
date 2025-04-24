const app = require('./app');
const { sequelize, authenticate } = require('./config/database');
const { initializeDefaultAdmin } = require('./routes/authRoutes');

const PORT = process.env.PORT || 5004;

// 初始化資料庫和預設管理員帳號
const initializeApp = async () => {
  try {
    // 測試資料庫連接
    const isConnected = await authenticate();
    if (!isConnected) {
      console.error('無法連接到資料庫，應用程式將停止');
      process.exit(1);
    }

    // 同步資料庫模型
    await sequelize.sync({ alter: true });
    console.log('資料庫模型已同步');

    // 初始化預設管理員帳號
    await initializeDefaultAdmin();

    // 啟動伺服器
    app.listen(PORT, () => {
      console.log(`伺服器運行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('應用程式初始化失敗:', error);
    process.exit(1);
  }
};

initializeApp(); 