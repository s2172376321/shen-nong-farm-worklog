const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'shen_nong_worklog',
  logging: console.log,
  define: {
    timestamps: true,
    underscored: true
  },
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// 測試資料庫連接
sequelize.authenticate()
  .then(() => {
    console.log('資料庫連接成功。');
  })
  .catch(err => {
    console.error('無法連接到資料庫:', err);
  });

module.exports = sequelize; 