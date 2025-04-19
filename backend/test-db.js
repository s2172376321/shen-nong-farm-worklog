const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// 檢查 .env 檔案是否存在
const envPath = path.join(__dirname, '.env');
console.log('.env 檔案路徑:', envPath);
console.log('.env 檔案是否存在:', require('fs').existsSync(envPath));

// 輸出所有環境變數（不包含密碼）
console.log('\n環境變數:');
for (const [key, value] of Object.entries(process.env)) {
  if (key.includes('PASSWORD')) {
    console.log(`${key}: [長度: ${value.length}]`);
  } else if (key.startsWith('DB_')) {
    console.log(`${key}: ${value}`);
  }
}

// 檢查密碼中的特殊字符
const password = process.env.DB_PASSWORD;
console.log('\n密碼分析:');
console.log('長度:', password.length);
console.log('字符類型:', {
  特殊字符: password.replace(/[a-zA-Z0-9]/g, ''),
  數字: password.replace(/[^0-9]/g, '').length,
  字母: password.replace(/[^a-zA-Z]/g, '').length
});

const config = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: console.log
};

console.log('\n連接配置:', {
  ...config,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  // 不顯示密碼
});

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  config
);

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('\n成功連接到資料庫！');
    
    const result = await sequelize.query('SELECT current_user, current_database()', {
      type: Sequelize.QueryTypes.SELECT
    });
    console.log('查詢結果:', result);
    
  } catch (error) {
    console.error('\n連接錯誤:', {
      name: error.name,
      message: error.message,
      code: error.parent?.code,
      detail: error.parent?.detail
    });
  } finally {
    await sequelize.close();
  }
}

testConnection(); 