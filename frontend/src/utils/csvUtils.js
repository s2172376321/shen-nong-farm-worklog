// 位置：backend/utils/csvUtils.js
const Papa = require('papaparse');
const fs = require('fs');

/**
 * 解析 CSV 檔案並轉換為工作日誌物件
 * @param {string} filePath - CSV 檔案路徑
 * @returns {Promise<Array>} - 解析後的工作日誌物件陣列
 */
const parseWorkLogCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const { data, errors, meta } = results;
          
          if (errors.length > 0) {
            return reject(new Error(`CSV 解析錯誤: ${errors[0].message}`));
          }
          
          // 驗證所需欄位
          const requiredFields = ['location', 'crop', 'startTime', 'endTime'];
          const missingFields = requiredFields.filter(field => 
            !meta.fields.includes(field)
          );
          
          if (missingFields.length > 0) {
            return reject(new Error(`CSV 缺少必要欄位: ${missingFields.join(', ')}`));
          }
          
          // 將 CSV 資料轉換為工作日誌物件
          const workLogs = data.map(row => {
            return {
              location: row.location,
              crop: row.crop,
              startTime: row.startTime,
              endTime: row.endTime,
              workCategories: row.workCategories ? row.workCategories.split(',') : [],
              details: row.details || '',
              harvestQuantity: parseFloat(row.harvestQuantity) || 0
            };
          });
          
          resolve(workLogs);
        },
        error: (error) => {
          reject(new Error(`CSV 解析錯誤: ${error.message}`));
        }
      });
    } catch (error) {
      reject(new Error(`讀取 CSV 檔案錯誤: ${error.message}`));
    }
  });
};

/**
 * 驗證工作日誌物件資料格式是否正確
 * @param {Object} workLog - 工作日誌物件
 * @returns {Object} - 驗證結果 {isValid, errors}
 */
const validateWorkLog = (workLog) => {
  const errors = [];
  
  // 檢查必填欄位
  if (!workLog.location) errors.push('作業地點不能為空');
  if (!workLog.crop) errors.push('作物名稱不能為空');
  if (!workLog.startTime) errors.push('開始時間不能為空');
  if (!workLog.endTime) errors.push('結束時間不能為空');
  
  // 檢查時間格式
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
};

module.exports = {
  parseWorkLogCSV,
  validateWorkLog
};