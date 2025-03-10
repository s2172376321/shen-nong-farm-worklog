// 位置：backend/controllers/dataController.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const DataController = {
  // 取得位置區域資料
  async getLocations(req, res) {
    try {
      const results = [];
      
      fs.createReadStream(path.join(__dirname, '../data/位置區域.csv'))
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          res.json(results);
        });
    } catch (error) {
      console.error('獲取位置資料失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 取得工作類別資料
  async getWorkCategories(req, res) {
    try {
      const results = [];
      
      fs.createReadStream(path.join(__dirname, '../data/代號工作內容.csv'))
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          res.json(results);
        });
    } catch (error) {
      console.error('獲取工作類別資料失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 取得產品資料
  async getProducts(req, res) {
    try {
      const results = [];
      
      fs.createReadStream(path.join(__dirname, '../data/商品.csv'))
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          res.json(results);
        });
    } catch (error) {
      console.error('獲取產品資料失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  }
};

module.exports = DataController;