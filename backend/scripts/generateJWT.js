const jwt = require('jsonwebtoken');

// 使用剛才生成的 secret，你也可以替換成你自己的 secret
const JWT_SECRET = '8735a6d0bb807c9136a0c6b61384b2ea218880b688442fac93527f71e8a3831b';

// 創建 payload
const payload = {
  sub: Math.random().toString(36).substring(7),  // 隨機生成的 subject
  name: 'Test User',
  role: 'user',  // 可以是 'user', 'admin', 或 'manager'
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60)  // 1小時後過期
};

// 生成 token
const token = jwt.sign(payload, JWT_SECRET);

console.log('Generated JWT Token:');
console.log(token);
console.log('\nDecoded payload:');
console.log(JSON.stringify(jwt.decode(token), null, 2)); 