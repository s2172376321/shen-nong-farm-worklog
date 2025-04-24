const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 建立備份目錄
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 取得當前日期時間作為檔案名稱
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-');
const backupFileName = `backup_${timestamp}.sql`;
const backupPath = path.join(backupDir, backupFileName);

// 資料庫連接資訊
const dbConfig = {
  database: process.env.DB_NAME || 'shen_nong_worklog',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1qazXSW@',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432
};

// 建立 pg_dump 命令
const command = `pg_dump -U ${dbConfig.user} -h ${dbConfig.host} -p ${dbConfig.port} -d ${dbConfig.database} -f "${backupPath}"`;

console.log('開始備份資料庫...');
console.log(`備份檔案將儲存至: ${backupPath}`);

// 執行備份命令
exec(command, { env: { PGPASSWORD: dbConfig.password } }, (error, stdout, stderr) => {
  if (error) {
    console.error('備份失敗:', error);
    return;
  }
  
  if (stderr) {
    console.error('警告:', stderr);
  }
  
  console.log('資料庫備份完成！');
  
  // 列出所有備份檔案
  const files = fs.readdirSync(backupDir);
  console.log('\n現有備份檔案:');
  files.forEach(file => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    console.log(`- ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  });
}); 