const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 檢查命令列參數
const backupFile = process.argv[2];
if (!backupFile) {
  console.error('請指定要還原的備份檔案名稱');
  console.log('使用方式: node restore.js <備份檔案名稱>');
  process.exit(1);
}

// 檢查備份檔案是否存在
const backupDir = path.join(__dirname, '../backups');
const backupPath = path.join(backupDir, backupFile);

if (!fs.existsSync(backupPath)) {
  console.error(`找不到備份檔案: ${backupPath}`);
  
  // 列出可用的備份檔案
  console.log('\n可用的備份檔案:');
  const files = fs.readdirSync(backupDir);
  files.forEach(file => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    console.log(`- ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  });
  
  process.exit(1);
}

// 資料庫連接資訊
const dbConfig = {
  database: process.env.DB_NAME || 'shen_nong_worklog',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1qazXSW@',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432
};

// 建立還原命令
const command = `psql -U ${dbConfig.user} -h ${dbConfig.host} -p ${dbConfig.port} -d ${dbConfig.database} -f "${backupPath}"`;

console.log('開始還原資料庫...');
console.log(`使用備份檔案: ${backupPath}`);

// 執行還原命令
exec(command, { env: { PGPASSWORD: dbConfig.password } }, (error, stdout, stderr) => {
  if (error) {
    console.error('還原失敗:', error);
    return;
  }
  
  if (stderr) {
    console.error('警告:', stderr);
  }
  
  if (stdout) {
    console.log('輸出:', stdout);
  }
  
  console.log('資料庫還原完成！');
}); 