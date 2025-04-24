const { sequelize } = require('../config/database');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
  try {
    // 刪除現有的管理員帳號
    await User.destroy({
      where: {
        username: '1224'
      }
    });

    // 創建新的管理員帳號
    const password = '5ji6gj94';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const adminUser = await User.create({
      username: '1224',
      email: 's217237632@gmail.com',
      password_hash,
      role: 'admin',
      is_active: true
    });

    console.log('管理員帳號已重置:', {
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role
    });

    process.exit(0);
  } catch (error) {
    console.error('重置管理員帳號失敗:', error);
    process.exit(1);
  }
}

resetAdmin(); 