const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 使用內存存儲庫存數據
const inventory = new Map();

// 驗證庫存項目
const validateInventoryItem = (item) => {
  const errors = [];
  
  if (!item.name?.trim()) errors.push('名稱為必填項');
  if (!item.code?.trim()) errors.push('編號為必填項');
  if (typeof item.quantity !== 'number' || item.quantity < 0) errors.push('數量必須為非負數');
  if (typeof item.minimumStock !== 'number' || item.minimumStock < 0) errors.push('最低庫存必須為非負數');
  
  return errors;
};

// 從 CSV 文件匯入庫存數據
const importInventoryFromCSV = async (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    console.log('開始讀取 CSV 文件:', filePath);
    
    fs.createReadStream(filePath, { encoding: 'utf-8' })
      .on('error', (error) => {
        console.error('讀取 CSV 文件失敗:', error);
        reject(error);
      })
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim(),
        mapValues: ({ value }) => value.trim()
      }))
      .on('data', (data) => {
        console.log('讀取到 CSV 行數據:', data);
        
        // 嘗試不同的列名格式
        const item = {
          id: uuidv4(),
          name: data['商品名稱'] || data['名稱'] || data['品名'] || '',
          code: data['產品編號'] || data['商品編號'] || data['編號'] || '',
          quantity: parseFloat(data['現有庫存'] || data['庫存'] || data['數量'] || '0') || 0,
          unit: data['單位'] || data['計量單位'] || '個',
          location: data['存放位置'] || data['位置'] || data['倉庫'] || '預設倉庫',
          category: data['類別'] || data['分類'] || data['種類'] || '其他',
          minimumStock: parseFloat(data['最低庫存'] || data['安全庫存'] || '0') || 0,
          description: data['描述'] || data['備註'] || data['說明'] || '',
          lastUpdated: new Date(),
          createdAt: new Date()
        };
        
        // 驗證項目
        const errors = validateInventoryItem(item);
        if (errors.length === 0) {
          console.log('轉換後的庫存項目:', item);
          results.push(item);
        } else {
          console.warn(`跳過無效的庫存項目: ${errors.join(', ')}`, data);
        }
      })
      .on('end', () => {
        console.log(`CSV 讀取完成，共 ${results.length} 條有效記錄`);
        
        // 清空現有庫存數據
        inventory.clear();
        console.log('已清空現有庫存數據');
        
        // 將新數據添加到庫存中
        results.forEach(item => {
          inventory.set(item.id, item);
        });
        console.log('已將新數據添加到庫存中');
        
        resolve(results);
      })
      .on('error', (error) => {
        console.error('處理 CSV 數據時發生錯誤:', error);
        reject(error);
      });
  });
};

const InventoryController = {
  // 獲取所有庫存項目
  async getAllItems(req, res) {
    try {
      console.log('獲取所有庫存項目');
      const items = Array.from(inventory.values());
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      console.error('獲取庫存項目失敗:', error);
      res.status(500).json({
        success: false,
        error: '獲取庫存項目失敗'
      });
    }
  },

  // 獲取單個庫存項目
  async getItemById(req, res) {
    try {
      const { id } = req.params;
      const item = inventory.get(id);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          error: '庫存項目不存在'
        });
      }
      
      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      console.error('獲取庫存項目失敗:', error);
      res.status(500).json({
        success: false,
        error: '獲取庫存項目失敗'
      });
    }
  },

  // 創建庫存項目
  async createItem(req, res) {
    try {
      const item = req.body;
      const errors = validateInventoryItem(item);
      
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          errors
        });
      }
      
      const id = uuidv4();
      const newItem = {
        ...item,
        id,
        lastUpdated: new Date()
      };
      
      inventory.set(id, newItem);
      
      res.status(201).json({
        success: true,
        data: newItem
      });
    } catch (error) {
      console.error('創建庫存項目失敗:', error);
      res.status(500).json({
        success: false,
        error: '創建庫存項目失敗'
      });
    }
  },

  // 更新庫存項目
  async updateItem(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      if (!inventory.has(id)) {
        return res.status(404).json({
          success: false,
          error: '庫存項目不存在'
        });
      }
      
      const currentItem = inventory.get(id);
      const updatedItem = {
        ...currentItem,
        ...updates,
        lastUpdated: new Date()
      };
      
      const errors = validateInventoryItem(updatedItem);
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          errors
        });
      }
      
      inventory.set(id, updatedItem);
      
      res.json({
        success: true,
        data: updatedItem
      });
    } catch (error) {
      console.error('更新庫存項目失敗:', error);
      res.status(500).json({
        success: false,
        error: '更新庫存項目失敗'
      });
    }
  },

  // 刪除庫存項目
  async deleteItem(req, res) {
    try {
      const { id } = req.params;
      
      if (!inventory.has(id)) {
        return res.status(404).json({
          success: false,
          error: '庫存項目不存在'
        });
      }
      
      inventory.delete(id);
      
      res.json({
        success: true,
        message: '庫存項目已刪除'
      });
    } catch (error) {
      console.error('刪除庫存項目失敗:', error);
      res.status(500).json({
        success: false,
        error: '刪除庫存項目失敗'
      });
    }
  },

  // 調整庫存數量
  async adjustQuantity(req, res) {
    try {
      const { id } = req.params;
      const { quantity, operation } = req.body;
      
      if (!inventory.has(id)) {
        return res.status(404).json({
          success: false,
          error: '庫存項目不存在'
        });
      }
      
      const item = inventory.get(id);
      let newQuantity = item.quantity;
      
      if (operation === 'add') {
        newQuantity += quantity;
      } else if (operation === 'subtract') {
        newQuantity -= quantity;
        if (newQuantity < 0) {
          return res.status(400).json({
            success: false,
            error: '庫存數量不能為負數'
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          error: '無效的操作類型'
        });
      }
      
      const updatedItem = {
        ...item,
        quantity: newQuantity,
        lastUpdated: new Date()
      };
      
      inventory.set(id, updatedItem);
      
      res.json({
        success: true,
        data: updatedItem
      });
    } catch (error) {
      console.error('調整庫存數量失敗:', error);
      res.status(500).json({
        success: false,
        error: '調整庫存數量失敗'
      });
    }
  },

  // 獲取庫存警報
  async getInventoryAlerts(req, res) {
    try {
      const items = Array.from(inventory.values());
      const alerts = items.filter(item => item.quantity <= item.minimumStock);
      
      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('獲取庫存警報失敗:', error);
      res.status(500).json({
        success: false,
        error: '獲取庫存警報失敗'
      });
    }
  },

  // 匯入 CSV 數據
  async importCSV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '請上傳 CSV 文件'
        });
      }
      
      const filePath = req.file.path;
      const items = await importInventoryFromCSV(filePath);
      
      // 清理上傳的文件
      fs.unlinkSync(filePath);
      
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      console.error('匯入 CSV 失敗:', error);
      res.status(500).json({
        success: false,
        error: '匯入 CSV 失敗'
      });
    }
  },

  // 同步產品到庫存
  async syncFromProducts(req, res) {
    try {
      // TODO: Implement product synchronization logic
      res.json({
        success: true,
        message: '產品同步完成'
      });
    } catch (error) {
      console.error('同步產品失敗:', error);
      res.status(500).json({
        success: false,
        error: '同步產品失敗'
      });
    }
  },

  // 獲取低庫存警報
  async getLowStockAlerts(req, res) {
    try {
      const items = Array.from(inventory.values());
      const alerts = items.filter(item => item.quantity <= item.minimumStock);
      
      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('獲取低庫存警報失敗:', error);
      res.status(500).json({
        success: false,
        error: '獲取低庫存警報失敗'
      });
    }
  },

  // 獲取統計數據
  async getStatistics(req, res) {
    try {
      const items = Array.from(inventory.values());
      const totalItems = items.length;
      const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price || 0), 0);
      const lowStockCount = items.filter(item => item.quantity <= item.minimumStock).length;
      
      res.json({
        success: true,
        data: {
          totalItems,
          totalValue,
          lowStockCount
        }
      });
    } catch (error) {
      console.error('獲取統計數據失敗:', error);
      res.status(500).json({
        success: false,
        error: '獲取統計數據失敗'
      });
    }
  },

  // 批量更新庫存項目
  async batchUpdate(req, res) {
    try {
      const updates = req.body;
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({
          success: false,
          error: '更新數據必須是數組'
        });
      }
      
      const results = [];
      const errors = [];
      
      for (const update of updates) {
        try {
          const { id, ...data } = update;
          
          if (!inventory.has(id)) {
            errors.push({ id, error: '庫存項目不存在' });
            continue;
          }
          
          const currentItem = inventory.get(id);
          const updatedItem = {
            ...currentItem,
            ...data,
            lastUpdated: new Date()
          };
          
          const validationErrors = validateInventoryItem(updatedItem);
          if (validationErrors.length > 0) {
            errors.push({ id, errors: validationErrors });
            continue;
          }
          
          inventory.set(id, updatedItem);
          results.push(updatedItem);
        } catch (error) {
          errors.push({ id: update.id, error: error.message });
        }
      }
      
      res.json({
        success: true,
        data: {
          updated: results,
          errors
        }
      });
    } catch (error) {
      console.error('批量更新失敗:', error);
      res.status(500).json({
        success: false,
        error: '批量更新失敗'
      });
    }
  }
};

module.exports = InventoryController; 