const db = require('../config/database');
const User = require('../models/User');

async function initDatabase() {
  try {
    // 同步所有模型
    await db.sync({ force: true });
    console.log('資料庫表已創建');

    // 創建管理員用戶
    const adminUser = await User.create({
      username: '1224',
      email: 'sz172376321@gmail.com',
      password: 'admin123',
      name: '管理員',
      role: 'admin'
    });
    console.log('管理員用戶已創建:', adminUser.toJSON());

    process.exit(0);
  } catch (error) {
    console.error('初始化資料庫失敗:', error);
    process.exit(1);
  }
}

initDatabase(); 