// 位置：backend/utils/csvUtils.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * 將數據轉換為 CSV 格式
 * @param {Array} data - 要轉換的數據數組
 * @param {Array} headers - CSV 標頭欄位
 * @returns {string} CSV 格式的字符串
 */
function convertToCSV(data, headers) {
  if (!Array.isArray(data) || !data.length) {
    return '';
  }

  // 創建標頭行
  let csv = headers.join(',') + '\n';

  // 添加數據行
  data.forEach(item => {
    const row = headers.map(header => {
      // 處理空值
      const value = item[header] !== undefined ? item[header] : '';
      
      // 如果值包含逗號、引號或換行符，加上引號
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    });
    
    csv += row.join(',') + '\n';
  });

  return csv;
}

/**
 * 格式化日期為 YYYY-MM-DD 格式
 * @param {Date|string} date - 日期對象或日期字符串
 * @returns {string} 格式化後的日期字符串
 */
function formatDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return ''; // 無效日期返回空字符串
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 解析 CSV 文件並返回數據對象數組
 * @param {string} filePath - CSV 文件路徑
 * @returns {Promise<Array>} 數據對象數組的 Promise
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * 解析 CSV 字符串並返回數據對象數組
 * @param {string} csvString - CSV 格式的字符串
 * @returns {Promise<Array>} 數據對象數組的 Promise
 */
function parseCSVString(csvString) {
  return new Promise((resolve, reject) => {
    const results = [];
    const tempFilePath = path.join(__dirname, `../temp/temp_${Date.now()}.csv`);
    
    // 確保臨時目錄存在
    if (!fs.existsSync(path.dirname(tempFilePath))) {
      fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
    }
    
    // 寫入臨時文件
    fs.writeFile(tempFilePath, csvString, (err) => {
      if (err) return reject(err);
      
      fs.createReadStream(tempFilePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          // 刪除臨時文件
          fs.unlink(tempFilePath, (unlinkErr) => {
            if (unlinkErr) console.error('刪除臨時文件失敗:', unlinkErr);
            resolve(results);
          });
        })
        .on('error', (error) => {
          // 清理臨時文件
          fs.unlink(tempFilePath, () => {
            reject(error);
          });
        });
    });
  });
}

/**
 * 解析工作日誌 CSV 文件
 * @param {string} filePath - CSV 文件路徑
 * @returns {Promise<Array>} 工作日誌數據數組
 */
async function parseWorkLogCSV(filePath) {
  try {
    const rawData = await parseCSV(filePath);
    
    // 轉換為工作日誌格式
    return rawData.map(row => {
      return {
        location: row.location || row.position_name || '',
        crop: row.crop || row.work_category_name || '',
        startTime: row.start_time || row.startTime || '',
        endTime: row.end_time || row.endTime || '',
        location_code: row.location_code || '',
        position_code: row.position_code || '',
        position_name: row.position_name || '',
        work_category_code: row.work_category_code || '',
        work_category_name: row.work_category_name || '',
        workCategories: row.work_categories || row.workCategories || '',
        details: row.details || '',
        harvestQuantity: parseFloat(row.harvest_quantity || row.harvestQuantity || 0) || 0
      };
    });
  } catch (error) {
    console.error('解析工作日誌 CSV 失敗:', error);
    throw error;
  }
}

/**
 * 驗證工作日誌數據
 * @param {Object} workLog - 工作日誌數據
 * @returns {Object} 驗證結果 {isValid, errors}
 */
function validateWorkLog(workLog) {
  const errors = [];
  
  // 檢查必填字段
  if (!workLog.position_code && !workLog.location) {
    errors.push('位置不能為空');
  }
  
  if (!workLog.work_category_code && !workLog.crop) {
    errors.push('工作類別不能為空');
  }
  
  if (!workLog.startTime) {
    errors.push('開始時間不能為空');
  }
  
  if (!workLog.endTime) {
    errors.push('結束時間不能為空');
  }
  
  // 驗證時間格式
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (workLog.startTime && !timeRegex.test(workLog.startTime)) {
    errors.push('開始時間格式不正確，應為 HH:MM');
  }
  
  if (workLog.endTime && !timeRegex.test(workLog.endTime)) {
    errors.push('結束時間格式不正確，應為 HH:MM');
  }
  
  // 檢查開始時間是否早於結束時間
  if (workLog.startTime && workLog.endTime && 
      timeRegex.test(workLog.startTime) && timeRegex.test(workLog.endTime)) {
    const start = new Date(`2000-01-01T${workLog.startTime}`);
    const end = new Date(`2000-01-01T${workLog.endTime}`);
    if (start >= end) {
      errors.push('開始時間必須早於結束時間');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  convertToCSV,
  formatDate,
  parseCSV,
  parseCSVString,
  parseWorkLogCSV,
  validateWorkLog
};