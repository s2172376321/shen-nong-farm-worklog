// 位置：backend/controllers/dataController.js
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// 將 fs.readFile 轉為 Promise 版本
const readFileAsync = promisify(fs.readFile);

// 定義數據文件路徑
const DATA_DIR = path.join(process.cwd(), 'data');
const LOCATION_FILE = path.join(DATA_DIR, '位置區域.csv');
const WORK_CATEGORIES_FILE = path.join(DATA_DIR, '工作類別.csv');

/**
 * 解析 CSV 字符串為對象數組
 * @param {string} csvContent CSV 內容
 * @returns {Array} 對象數組
 */
const parseCSV = (csvContent) => {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return [];
  
  // 解析標題行，移除標題中的引號和空白
  const headers = lines[0].replace(/"/g, '').split(',').map(header => header.trim());
  
  const results = [];
  
  // 從第2行開始解析數據
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // 解析CSV行，處理引號內的逗號
    const rowValues = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let char of lines[i].replace(/"/g, '')) {
      if (char === ',' && !inQuotes) {
        rowValues.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // 添加最後一個值
    rowValues.push(currentValue.trim());
    
    // 創建對象
    const entry = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j] && rowValues[j]) { // 只添加有效的鍵值對
        entry[headers[j]] = rowValues[j];
      }
    }
    
    // 只添加非空對象
    if (Object.keys(entry).length > 0) {
      results.push(entry);
    }
  }
  
  return results;
};

const DataController = {
  // 獲取所有位置資料
  async getLocations(req, res) {
    try {
      console.log('嘗試讀取位置區域CSV文件:', LOCATION_FILE);
      
      // 檢查文件是否存在
      if (!fs.existsSync(LOCATION_FILE)) {
        console.error('位置區域.csv 文件不存在');
        return res.status(404).json({ 
          message: '位置數據檔案未找到',
          filePath: LOCATION_FILE
        });
      }
      
      // 讀取CSV文件
      const fileContent = await readFileAsync(LOCATION_FILE, 'utf8');
      
      // 解析CSV
      const results = parseCSV(fileContent)
        .filter(row => row.區域名稱 && row.位置代號 && row.位置名稱); // 過濾掉空行
      
      console.log(`成功讀取 ${results.length} 條位置記錄`);
      return res.json(results);
    } catch (error) {
      console.error('獲取位置資料失敗:', {
        message: error.message,
        stack: error.stack,
        fileName: 'dataController.js',
        method: 'getLocations'
      });
      return res.status(500).json({ 
        message: '獲取位置資料失敗', 
        error: error.message,
        details: '請聯繫系統管理員'
      });
    }
  },
  
  // 獲取按區域分組的位置資料
  async getLocationsByArea(req, res) {
    try {
      console.log('嘗試讀取位置區域CSV文件:', LOCATION_FILE);
      
      // 檢查文件是否存在
      if (!fs.existsSync(LOCATION_FILE)) {
        console.error('位置區域.csv 文件不存在');
        return res.status(404).json({ 
          message: '位置數據檔案未找到',
          filePath: LOCATION_FILE
        });
      }
      
      // 讀取CSV文件
      const fileContent = await readFileAsync(LOCATION_FILE, 'utf8');
      
      // 解析CSV
      const results = parseCSV(fileContent)
        .filter(row => row.區域名稱 && row.位置代號 && row.位置名稱); // 過濾掉空行
      
      // 組織數據按區域分組
      const areaMap = {};
      
      results.forEach(row => {
        const areaName = row.區域名稱 || '未分類區域';
        
        if (!areaMap[areaName]) {
          areaMap[areaName] = [];
        }
        
        areaMap[areaName].push({
          locationCode: row.位置代號,
          locationName: row.位置名稱
        });
      });
      
      // 轉換為前端需要的格式
      const areas = Object.keys(areaMap).map(areaName => ({
        areaName,
        locations: areaMap[areaName]
      }));
      
      console.log(`成功分組 ${areas.length} 個區域的位置數據`);
      return res.json(areas);
    } catch (error) {
      console.error('獲取按區域分組的位置資料失敗:', {
        message: error.message,
        stack: error.stack,
        fileName: 'dataController.js',
        method: 'getLocationsByArea'
      });
      return res.status(500).json({ 
        message: '獲取按區域分組的位置資料失敗', 
        error: error.message,
        details: '請聯繫系統管理員'
      });
    }
  },
  
  // 獲取工作類別資料
  async getWorkCategories(req, res) {
    try {
      console.log('工作目錄:', process.cwd());
      console.log('嘗試讀取工作類別CSV文件:', WORK_CATEGORIES_FILE);
      console.log('文件是否存在:', fs.existsSync(WORK_CATEGORIES_FILE));
      
      // 檢查文件是否存在
      if (!fs.existsSync(WORK_CATEGORIES_FILE)) {
        console.error('工作類別.csv 文件不存在');
        return res.status(404).json({ 
          message: '工作類別檔案未找到',
          filePath: WORK_CATEGORIES_FILE,
          currentDir: process.cwd(),
          searchedPath: path.resolve(WORK_CATEGORIES_FILE)
        });
      }
      
      // 讀取CSV文件
      console.log('開始讀取文件...');
      const fileContent = await readFileAsync(WORK_CATEGORIES_FILE, 'utf8');
      console.log('文件讀取成功，內容長度:', fileContent.length);
      
      // 解析CSV
      const results = parseCSV(fileContent)
        .filter(row => row.工作內容代號 && row.工作內容名稱); // 過濾掉空行
      
      console.log('解析結果:', {
        totalRows: results.length,
        firstRow: results[0],
        lastRow: results[results.length - 1]
      });
      
      // 標準化成本類別
      const standardizedResults = results.map(item => ({
        工作內容代號: item.工作內容代號,
        工作內容名稱: item.工作內容名稱,
        成本類別: parseInt(item.成本類別) || 0
      }));
      
      console.log(`成功讀取 ${standardizedResults.length} 條工作類別記錄`);
      return res.json(standardizedResults);
    } catch (error) {
      console.error('獲取工作類別資料失敗:', {
        message: error.message,
        stack: error.stack,
        fileName: 'dataController.js',
        method: 'getWorkCategories',
        currentDir: process.cwd(),
        searchedPath: path.resolve(WORK_CATEGORIES_FILE)
      });
      return res.status(500).json({ 
        message: '獲取工作類別資料失敗', 
        error: error.message,
        details: '請聯繫系統管理員',
        currentDir: process.cwd(),
        searchedPath: path.resolve(WORK_CATEGORIES_FILE)
      });
    }
  },
  
  // 獲取產品資料
  async getProducts(req, res) {
    try {
      const csvPath = path.join(__dirname, '../../data/產品.csv');
      console.log('嘗試讀取產品CSV文件:', csvPath);
      
      // 檢查文件是否存在
      if (!fs.existsSync(csvPath)) {
        console.error('產品.csv 文件不存在');
        return res.status(404).json({ 
          message: '產品檔案未找到',
          filePath: csvPath
        });
      }
      
      // 讀取CSV文件
      const fileContent = await readFileAsync(csvPath, 'utf8');
      
      // 解析CSV
      const rawResults = parseCSV(fileContent);
      
      // 處理數據格式
      const results = rawResults.map(item => {
        // 處理中分類欄位，嘗試轉換為數字
        let category = item['中分類'];
        if (typeof category === 'string') {
          category = parseInt(category, 10) || 0;
        }
        
        return {
          商品編號: item['商品編號'],
          規格: item['規    格'] || item['規格'], // 處理可能的不同欄位名稱
          顏色: item['顏色'],
          中分類: category,
          單位: item['單位']
        };
      });
      
      console.log(`成功讀取 ${results.length} 條產品記錄`);
      return res.json(results);
    } catch (error) {
      console.error('獲取產品資料失敗:', {
        message: error.message,
        stack: error.stack,
        fileName: 'dataController.js',
        method: 'getProducts'
      });
      return res.status(500).json({ 
        message: '獲取產品資料失敗', 
        error: error.message,
        details: '請聯繫系統管理員'
      });
    }
  }
};

module.exports = DataController;