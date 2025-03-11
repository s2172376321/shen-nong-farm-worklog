// 位置：backend/controllers/locationController.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const LocationController = {
  // 獲取所有位置資料
  async getAllLocations(req, res) {
    try {
      const results = [];
      const csvPath = path.join(__dirname, '../../data/位置區域.csv');
      
      // 確認文件存在
      if (!fs.existsSync(csvPath)) {
        return res.status(404).json({ message: '位置數據檔案未找到' });
      }
      
      // 創建一個流並解析 CSV
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          // 組織數據按區域分組
          const areaMap = {};
          
          results.forEach(row => {
            const areaName = row['區域名稱'];
            const locationCode = row['位置代號'];
            const locationName = row['位置名稱'];
            
            if (!areaMap[areaName]) {
              areaMap[areaName] = [];
            }
            
            areaMap[areaName].push({
              locationCode,
              locationName
            });
          });
          
          // 轉換為前端需要的格式
          const areas = Object.keys(areaMap).map(areaName => ({
            areaName,
            locations: areaMap[areaName]
          }));
          
          return res.json(areas);
        });
    } catch (error) {
      console.error('獲取位置資料失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  }
};

module.exports = LocationController;