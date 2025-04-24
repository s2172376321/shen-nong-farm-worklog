const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// 確保日誌目錄存在
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 獲取當前日誌檔案路徑
const getLogFilePath = () => {
    const date = format(new Date(), 'yyyy-MM-dd');
    return path.join(logDir, `${date}.log`);
};

// 寫入日誌
const writeLog = (level, message) => {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    try {
        fs.appendFileSync(getLogFilePath(), logMessage);
    } catch (error) {
        console.error('寫入日誌失敗:', error);
    }
};

// 創建日誌記錄函數
const createLog = (level, message) => {
    // 同時輸出到控制台和檔案
    console.log(`[${level.toUpperCase()}] ${message}`);
    writeLog(level, message);
};

module.exports = {
    createLog
}; 