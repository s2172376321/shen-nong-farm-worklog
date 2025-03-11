// 位置：backend/controllers/dataController.js
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// 將 fs.readFile 轉為 Promise 版本
const readFileAsync = promisify(fs.readFile);

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
      entry[headers[j]] = rowValues[j] || '';
    }
    
    results.push(entry);
  }
  
  return results;
};

const DataController = {
  // 獲取所有位置資料
  async getLocations(req, res) {
    try {
      const csvPath = path.join(__dirname, '../../data/位置區域.csv');
      console.log('嘗試讀取CSV文件:', csvPath);
      
      // 檢查文件是否存在
      if (!fs.existsSync(csvPath)) {
        console.error('位置區域.csv 文件不存在');
        return res.status(404).json({ 
          message: '位置數據檔案未找到',
          filePath: csvPath
        });
      }
      
      // 讀取CSV文件
      const fileContent = await readFileAsync(csvPath, 'utf8');
      
      // 解析CSV
      const results = parseCSV(fileContent);
      
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
      const csvPath = path.join(__dirname, '../../data/位置區域.csv');
      console.log('嘗試讀取CSV文件:', csvPath);
      
      // 檢查文件是否存在
      if (!fs.existsSync(csvPath)) {
        console.error('位置區域.csv 文件不存在');
        return res.status(404).json({ 
          message: '位置數據檔案未找到',
          filePath: csvPath
        });
      }
      
      // 讀取CSV文件
      const fileContent = await readFileAsync(csvPath, 'utf8');
      
      // 解析CSV
      const results = parseCSV(fileContent);
      
      // 組織數據按區域分組
      const areaMap = {};
      
      results.forEach(row => {
        const areaName = row['區域名稱'] || '未分類區域';
        
        if (!areaMap[areaName]) {
          areaMap[areaName] = [];
        }
        
        areaMap[areaName].push({
          locationCode: row['位置代號'],
          locationName: row['位置名稱']
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
      const csvPath = path.join(__dirname, '../../data/工作類別.csv');
      console.log('嘗試讀取工作類別CSV文件:', csvPath);
      
      // 檢查文件是否存在
      if (!fs.existsSync(csvPath)) {
        console.error('工作類別.csv 文件不存在');
        return res.status(404).json({ 
          message: '工作類別檔案未找到',
          filePath: csvPath
        });
      }
      
      // 讀取CSV文件
      const fileContent = await readFileAsync(csvPath, 'utf8');
      
      // 解析CSV
      const rawResults = parseCSV(fileContent);
      
      // 處理成本類別欄位
      const results = rawResults.map(item => {
        // 獲取成本類別列的值
        const costCategoryKey = Object.keys(item).find(key => 
          key.includes('成本類別') || key.includes('成本類型')
        );
        
        let costCategory = 0; // 默認值
        
        if (costCategoryKey && item[costCategoryKey]) {
          // 解析成本類別值
          const value = item[costCategoryKey].trim();
          if (value.startsWith('1') || value.includes('收成入庫')) {
            costCategory = 1;
          } else if (value.startsWith('2') || value.includes('領用材料扣庫存')) {
            costCategory = 2;
          } else if (value.startsWith('3') || value.includes('領用材料計入成本不扣庫存')) {
            costCategory = 3;
          }
        }
        
        // 創建標準化的對象
        return {
          工作內容代號: item['工作內容代號'],
          工作內容名稱: item['工作內容名稱'],
          成本類別: costCategory
        };
      });
      
      console.log(`成功讀取 ${results.length} 條工作類別記錄`);
      return res.json(results);
    } catch (error) {
      console.error('獲取工作類別資料失敗:', {
        message: error.message,
        stack: error.stack,
        fileName: 'dataController.js',
        method: 'getWorkCategories'
      });
      return res.status(500).json({ 
        message: '獲取工作類別資料失敗', 
        error: error.message,
        details: '請聯繫系統管理員'
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