const db = require('../config/database');
const User = require('./User');
const WorkLog = require('./WorkLog');

// 定義模型之間的關聯
User.hasMany(WorkLog, { 
  foreignKey: 'user_id',
  as: 'workLogs'
});
WorkLog.belongsTo(User, { 
  foreignKey: 'user_id',
  as: 'user'
});

// 同步模型到數據庫
db.sync({ 
  force: true, // 刪除現有表並重新創建
  logging: console.log
})
  .then(() => {
    console.log('Database & tables created!');
  })
  .catch(err => {
    console.error('Error syncing database:', err);
  });

module.exports = {
  User,
  WorkLog
}; 