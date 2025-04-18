const sequelize = require('../config/database');
const User = require('./User');

// 在這裡定義模型之間的關聯
// 目前只有 User 模型，之後新增其他模型時再加入關聯

const models = {
  User
};

// 測試資料庫連接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('資料庫連接成功。');
  } catch (error) {
    console.error('無法連接到資料庫:', error);
  }
};

// 同步所有模型到資料庫
const syncModels = async () => {
  try {
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('資料庫模型同步完成。');
  } catch (error) {
    console.error('資料庫模型同步失敗:', error);
  }
};

module.exports = {
  sequelize,
  models,
  testConnection,
  syncModels
}; 