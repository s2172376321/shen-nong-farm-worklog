require('dotenv').config();
const app = require('./app');
const db = require('./config/database');

// 測試資料庫連接
db.connect()
  .then(client => {
    console.log('資料庫連接成功。');
    client.release();
  })
  .catch(err => {
    console.error('無法連接到資料庫:', err);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`伺服器運行在端口 ${PORT}`);
}); 