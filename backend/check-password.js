const bcrypt = require('bcryptjs');

// 測試密碼
const password = 'Admin2024!';

// 生成新的哈希
const salt = bcrypt.genSaltSync(10);
const newPasswordHash = bcrypt.hashSync(password, salt);

console.log('新生成的哈希值:', newPasswordHash);

// 嘗試不同的雜湊方法
const alternativeHash = bcrypt.hashSync(password);

console.log('另一種方法生成的哈希值:', alternativeHash);

// 驗證原始哈希
const originalHash = '$2a$12$1tP3.hJB.ZiKR.8UHyVdW.YJwkwZZaCwxUp.LHXjJD5Pwbgk/hJ7O';
console.log('原始哈希長度:', originalHash.length);

// 多次嘗試比較
console.log('使用新生成哈希比較:', bcrypt.compareSync(password, newPasswordHash));
console.log('使用另一種方法生成的哈希比較:', bcrypt.compareSync(password, alternativeHash));
console.log('使用原始哈希比較:', bcrypt.compareSync(password, originalHash));