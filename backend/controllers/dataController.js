// 位置：backend/controllers/dataController.js
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// 預設數據 - 當CSV檔案無法讀取時使用
const defaultLocations = [
  { "位置代號": "A1", "區域名稱": "A區", "位置名稱": "A1菜園" },
  { "位置代號": "A2", "區域名稱": "A區", "位置名稱": "A2菜園" },
  { "位置代號": "B1", "區域名稱": "B區", "位置名稱": "B1菜園" },
  { "位置代號": "B2", "區域名稱": "B區", "位置名稱": "B2菜園" },
  { "位置代號": "C1", "區域名稱": "C區", "位置名稱": "C1菜園" }
];

const defaultWorkCategories = [
  { "工作內容代號": "1", "工作內容名稱": "整地" },
  { "工作內容代號": "2", "工作內容名稱": "種植" },
  { "工作內容代號": "3", "工作內容名稱": "施肥" },
  { "工作內容代號": "4", "工作內容名稱": "澆水" },
  { "工作內容代號": "5", "工作內容名稱": "收成" }
];

const defaultProducts = [
  { "產品代號": "P001", "產品名稱": "小白菜", "單位": "台斤" },
  { "產品代號": "P002", "產品名稱": "高麗菜", "單位": "台斤" },
  { "產品代號": "P003", "產品名稱": "番茄", "單位": "台斤" },
  { "產品代號": "P004", "產品名稱": "茄子", "單位": "台斤" },
  { "產品代號": "P005", "產品名稱": "辣椒", "單位": "台斤" }
];

const DataController = {
  // 取得位置資料
  getLocations: async (req, res) => {
    try {
      // 嘗試從CSV檔案中讀取資料
      const filePath = path.resolve(__dirname, '../data/位置區域.csv');
      let locations;

      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        locations = parse(fileContent, {
          columns: true,
          skip_empty_lines: true
        });
      } catch (fileError) {
        console.warn(`無法讀取位置資料檔案: ${fileError.message}`);
        // 使用預設資料
        locations = defaultLocations;
      }

      res.json(locations);
    } catch (error) {
      console.error('獲取位置資料失敗:', error);
      res.status(500).json({ message: '獲取位置資料失敗' });
    }
  },

  // 取得工作類別資料
  getWorkCategories: async (req, res) => {
    try {
      // 嘗試從CSV檔案中讀取資料
      const filePath = path.resolve(__dirname, '../data/工作類別.csv');
      let categories;

      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        categories = parse(fileContent, {
          columns: true,
          skip_empty_lines: true
        });
      } catch (fileError) {
        console.warn(`無法讀取工作類別檔案: ${fileError.message}`);
        // 使用預設資料
        categories = defaultWorkCategories;
      }

      res.json(categories);
    } catch (error) {
      console.error('獲取工作類別失敗:', error);
      res.status(500).json({ message: '獲取工作類別失敗' });
    }
  },

  // 取得產品資料
  getProducts: async (req, res) => {
    try {
      // 嘗試從CSV檔案中讀取資料
      const filePath = path.resolve(__dirname, '../data/產品.csv');
      let products;

      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        products = parse(fileContent, {
          columns: true,
          skip_empty_lines: true
        });
      } catch (fileError) {
        console.warn(`無法讀取產品檔案: ${fileError.message}`);
        // 使用預設資料
        products = defaultProducts;
      }

      res.json(products);
    } catch (error) {
      console.error('獲取產品資料失敗:', error);
      res.status(500).json({ message: '獲取產品資料失敗' });
    }
  }
};

module.exports = DataController;