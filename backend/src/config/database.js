const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// 測試資料庫連接
sequelize
  .authenticate()
  .then(() => {
    console.log('資料庫連接成功。');
  })
  .catch(err => {
    console.error('無法連接到資料庫:', err);
  });

module.exports = sequelize; 