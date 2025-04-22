const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Product = require('../models/Product');
const db = require('../db/db');

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
          name: data['商品名稱'] || data['名稱'] || data['品名'] || '',
          code: data['產品編號'] || data['商品編號'] || data['編號'] || '',
          quantity: parseFloat(data['現有庫存'] || data['庫存'] || data['數量'] || '0') || 0,
          unit: data['單位'] || data['計量單位'] || '個',
          location: data['存放位置'] || data['位置'] || data['倉庫'] || '預設倉庫',
          category: data['類別'] || data['分類'] || data['種類'] || '其他',
          minimum_stock: parseFloat(data['最低庫存'] || data['安全庫存'] || '0') || 0,
          description: data['描述'] || data['備註'] || data['說明'] || ''
        };
        
        results.push(item);
      })
      .on('end', () => {
        console.log('CSV 文件讀取完成，共讀取', results.length, '條記錄');
        resolve(results);
      });
  });
};

const InventoryController = {
  // 同步產品到庫存
  async syncFromProducts(req, res) {
    try {
      // Get all products from the database
      const products = await Product.find({});
      
      // Update inventory based on products
      for (const product of products) {
        const existingItem = Array.from(inventory.values()).find(item => item.code === product.code);
        
        if (existingItem) {
          // Update existing inventory item
          const updatedItem = {
            ...existingItem,
            name: product.name,
            category: product.category || existingItem.category,
            description: product.description || existingItem.description,
            lastUpdated: new Date()
          };
          inventory.set(existingItem.id, updatedItem);
        } else {
          // Create new inventory item
          const newItem = {
            id: uuidv4(),
            name: product.name,
            code: product.code,
            quantity: 0,
            unit: product.unit || '個',
            location: '預設倉庫',
            category: product.category || '其他',
            minimumStock: 0,
            description: product.description || '',
            lastUpdated: new Date()
          };
          inventory.set(newItem.id, newItem);
        }
      }
      
      res.json({ 
        success: true, 
        message: `已同步 ${products.length} 個產品到庫存`,
        data: Array.from(inventory.values())
      });
    } catch (error) {
      console.error('同步產品到庫存時發生錯誤:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 獲取所有庫存項目
  async getAllItems(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          id,
          code as product_id,
          name as product_name,
          quantity as current_quantity,
          unit,
          location,
          category,
          minimum_stock,
          description,
          created_at,
          updated_at
        FROM inventory_items 
        ORDER BY name
      `);

      // 格式化數據
      const formattedData = result.rows.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        current_quantity: parseFloat(item.current_quantity) || 0,
        unit: item.unit || '個',
        location: item.location || '預設倉庫',
        category: item.category || '其他',
        minimum_stock: parseFloat(item.minimum_stock) || 0,
        description: item.description || '',
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      console.log('返回庫存數據:', formattedData);
      res.json({ success: true, data: formattedData });
    } catch (error) {
      console.error('獲取庫存項目失敗:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 獲取單個庫存項目
  async getItemById(req, res) {
    try {
      const result = await db.query('SELECT * FROM inventory_items WHERE id = $1', [req.params.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: '找不到該庫存項目' });
      }
      
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('獲取庫存項目失敗:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 創建庫存項目
  async createItem(req, res) {
    try {
      const { name, code, quantity, unit, location, category, minimum_stock, description } = req.body;
      
      const result = await db.query(
        `INSERT INTO inventory_items 
         (name, code, quantity, unit, location, category, minimum_stock, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [name, code, quantity, unit, location, category, minimum_stock, description]
      );
      
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('創建庫存項目失敗:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 更新庫存項目
  async updateItem(req, res) {
    try {
      const { name, code, quantity, unit, location, category, minimum_stock, description } = req.body;
      
      const result = await db.query(
        `UPDATE inventory_items 
         SET name = $1, code = $2, quantity = $3, unit = $4, 
             location = $5, category = $6, minimum_stock = $7, 
             description = $8, updated_at = CURRENT_TIMESTAMP
         WHERE id = $9
         RETURNING *`,
        [name, code, quantity, unit, location, category, minimum_stock, description, req.params.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: '找不到該庫存項目' });
      }
      
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('更新庫存項目失敗:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 刪除庫存項目
  async deleteItem(req, res) {
    try {
      const result = await db.query(
        'DELETE FROM inventory_items WHERE id = $1 RETURNING *',
        [req.params.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: '找不到該庫存項目' });
      }
      
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('刪除庫存項目失敗:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 調整庫存數量
  async adjustQuantity(req, res) {
    try {
      const { adjustment, reason } = req.body;
      
      const result = await db.query(
        `UPDATE inventory_items 
         SET quantity = quantity + $1,
             last_updated = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [adjustment, req.params.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: '找不到該庫存項目' });
      }
      
      // 記錄庫存變動
      await db.query(
        `INSERT INTO inventory_transactions 
         (inventory_id, adjustment, reason)
         VALUES ($1, $2, $3)`,
        [req.params.id, adjustment, reason]
      );
      
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('調整庫存數量失敗:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 獲取庫存警報
  async getInventoryAlerts(req, res) {
    try {
      const result = await db.query(`
        SELECT * FROM inventory_items 
        WHERE quantity <= minimum_stock
        ORDER BY name
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('獲取庫存警報失敗:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 匯入 CSV 數據
  async importCSV(req, res) {
    try {
      if (!req.file) {
        throw new Error('未上傳文件');
      }

      console.log('開始處理上傳的 CSV 文件:', req.file.path);
      const items = await importInventoryFromCSV(req.file.path);
      
      // 批量插入數據
      for (const item of items) {
        await db.query(
          `INSERT INTO inventory_items 
           (name, code, quantity, unit, location, category, minimum_stock, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           quantity = EXCLUDED.quantity,
           unit = EXCLUDED.unit,
           location = EXCLUDED.location,
           category = EXCLUDED.category,
           minimum_stock = EXCLUDED.minimum_stock,
           description = EXCLUDED.description,
           updated_at = CURRENT_TIMESTAMP`,
          [item.name, item.code, item.quantity, item.unit, item.location, item.category, item.minimum_stock, item.description]
        );
      }

      // 刪除上傳的文件
      fs.unlinkSync(req.file.path);
      
      res.json({ 
        success: true, 
        message: `成功導入 ${items.length} 條記錄`
      });
    } catch (error) {
      console.error('導入 CSV 失敗:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 獲取低庫存警報
  async getLowStockAlerts(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          id,
          code as product_id,
          name as product_name,
          quantity as current_quantity,
          unit,
          location,
          category,
          minimum_stock,
          description,
          created_at,
          updated_at
        FROM inventory_items 
        WHERE quantity <= minimum_stock
        ORDER BY name
      `);
      
      // 格式化數據
      const formattedData = result.rows.map(item => ({
        ...item,
        current_quantity: parseFloat(item.current_quantity) || 0,
        minimum_stock: parseFloat(item.minimum_stock) || 0
      }));
      
      res.json({ success: true, data: formattedData });
    } catch (error) {
      console.error('獲取低庫存警報失敗:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 獲取庫存統計
  async getInventoryStats(req, res) {
    try {
      // 基礎統計查詢
      const statsQuery = `
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN quantity <= minimum_stock THEN 1 END) as low_stock_count
        FROM inventory_items;
      `;

      const statsResult = await db.query(statsQuery);
      const stats = statsResult.rows[0];
      
      res.json({
        success: true,
        stats: {
          total_items: parseInt(stats.total_items) || 0,
          low_stock_count: parseInt(stats.low_stock_count) || 0
        }
      });
    } catch (error) {
      console.error('獲取庫存統計失敗:', error);
      res.status(500).json({ 
        success: false,
        message: '獲取庫存統計失敗，請稍後再試',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // 批量更新庫存項目
  async batchUpdate(req, res) {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ success: false, error: '請提供有效的更新數據' });
      }

      const results = [];
      for (const update of items) {
        const item = inventory.get(update.id);
        if (item) {
          const updatedItem = {
            ...item,
            ...update,
            lastUpdated: new Date()
          };
          inventory.set(item.id, updatedItem);
          results.push(updatedItem);
        }
      }

      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 導出庫存數據為 CSV
  async exportCSV(req, res) {
    try {
      const items = Array.from(inventory.values());
      const csvData = items.map(item => ({
        '商品名稱': item.name,
        '產品編號': item.code,
        '現有庫存': item.quantity,
        '單位': item.unit,
        '存放位置': item.location,
        '類別': item.category,
        '最低庫存': item.minimumStock,
        '描述': item.description
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
      
      // 簡單的 CSV 生成
      const csvString = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(item => Object.values(item).join(','))
      ].join('\n');

      res.send(csvString);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = InventoryController; 