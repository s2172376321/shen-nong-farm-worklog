const bcrypt = require('bcryptjs');

// 生成新的密碼哈希
const newPassword = 'Admin2024!';
const salt = bcrypt.genSaltSync(10);
const newPasswordHash = bcrypt.hashSync(newPassword, salt);

console.log('新密碼:', newPassword);
console.log('新密碼哈希:', newPasswordHash);