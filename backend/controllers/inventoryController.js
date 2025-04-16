// 位置：backend/controllers/inventoryController.js
const db = require('../config/database');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

const InventoryController = {
  // 獲取所有庫存項目
  async getAllItems(req, res) {
    try {
      const query = `
        SELECT i.*, 
               COALESCE(SUM(CASE WHEN t.transaction_type = 'in' THEN t.quantity ELSE 0 END), 0) as total_in,
               COALESCE(SUM(CASE WHEN t.transaction_type = 'out' THEN t.quantity ELSE 0 END), 0) as total_out
        FROM inventory_items i
        LEFT JOIN inventory_transactions t ON i.id = t.inventory_item_id
        GROUP BY i.id
        ORDER BY i.category, i.product_name
      `;

      const result = await db.query(query);
      
      res.json(result.rows);
    } catch (error) {
      console.error('獲取庫存列表失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 獲取單一庫存項目詳情
  async getItemDetails(req, res) {
    const { itemId } = req.params;

    try {
      // 查詢庫存項目
      const itemQuery = `
        SELECT * FROM inventory_items WHERE id = $1
      `;
      const itemResult = await db.query(itemQuery, [itemId]);
      
      if (itemResult.rows.length === 0) {
        return res.status(404).json({ message: '找不到該庫存項目' });
      }
      
      // 查詢最近的交易記錄
      const transactionsQuery = `
        SELECT t.*, u.username 
        FROM inventory_transactions t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.inventory_item_id = $1
        ORDER BY t.created_at DESC
        LIMIT 20
      `;
      const transactionsResult = await db.query(transactionsQuery, [itemId]);
      
      res.json({
        item: itemResult.rows[0],
        transactions: transactionsResult.rows
      });
    } catch (error) {
      console.error('獲取庫存項目詳情失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 透過產品ID獲取庫存項目
  async getItemByProductId(req, res) {
    const { productId } = req.params;

    try {
      const query = `
        SELECT * FROM inventory_items WHERE product_id = $1
      `;
      const result = await db.query(query, [productId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: '找不到該庫存項目' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('透過產品ID獲取庫存項目失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 創建新庫存項目
  async createItem(req, res) {
    const { 
      product_id, 
      product_name, 
      category,
      description,
      unit,
      current_quantity,
      min_quantity
    } = req.body;

    try {
      // 檢查是否已存在相同產品ID的項目
      const checkQuery = `SELECT id FROM inventory_items WHERE product_id = $1`;
      const checkResult = await db.query(checkQuery, [product_id]);
      
      if (checkResult.rows.length > 0) {
        return res.status(400).json({ message: '已存在相同產品ID的庫存項目' });
      }
      
      // 插入新項目
      const insertQuery = `
        INSERT INTO inventory_items 
        (product_id, product_name, category, description, unit, current_quantity, min_quantity)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        product_id,
        product_name,
        category || '其他',
        description || '',
        unit || '個',
        current_quantity || 0,
        min_quantity || 0
      ];
      
      const result = await db.query(insertQuery, values);
      const newItem = result.rows[0];
      
      // 生成QR Code並保存
      await this.generateAndSaveQRCode(newItem.id, product_id);
      
      // 如果初始數量大於0，記錄一筆進貨交易
      if (parseFloat(current_quantity) > 0) {
        const transactionQuery = `
          INSERT INTO inventory_transactions
          (inventory_item_id, transaction_type, quantity, user_id, purpose, notes)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
        
        await db.query(transactionQuery, [
          newItem.id,
          'adjust',
          parseFloat(current_quantity),
          req.user.id,
          '初始庫存設定',
          '系統初始化'
        ]);
      }
      
      // 獲取更新後的項目
      const updatedItemQuery = `SELECT * FROM inventory_items WHERE id = $1`;
      const updatedResult = await db.query(updatedItemQuery, [newItem.id]);
      
      res.status(201).json(updatedResult.rows[0]);
    } catch (error) {
      console.error('創建庫存項目失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 更新庫存項目
  async updateItem(req, res) {
    const { itemId } = req.params;
    const { 
      product_name, 
      category,
      description,
      unit,
      min_quantity
    } = req.body;

    try {
      // 檢查項目是否存在
      const checkQuery = `SELECT id FROM inventory_items WHERE id = $1`;
      const checkResult = await db.query(checkQuery, [itemId]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: '找不到該庫存項目' });
      }
      
      // 更新項目
      const updateQuery = `
        UPDATE inventory_items 
        SET 
          product_name = COALESCE($1, product_name),
          category = COALESCE($2, category),
          description = COALESCE($3, description),
          unit = COALESCE($4, unit),
          min_quantity = COALESCE($5, min_quantity),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `;
      
      const values = [
        product_name,
        category,
        description,
        unit,
        min_quantity,
        itemId
      ];
      
      const result = await db.query(updateQuery, values);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('更新庫存項目失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 調整庫存數量
  async adjustQuantity(req, res) {
    const { itemId } = req.params;
    const { 
      transaction_type, 
      quantity,
      requester_name,
      purpose,
      notes
    } = req.body;

    try {
      // 驗證交易類型
      if (!['in', 'out', 'adjust'].includes(transaction_type)) {
        return res.status(400).json({ message: '無效的交易類型' });
      }
      
      // 檢查數量是否有效
      if (typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ message: '數量必須是大於0的數字' });
      }
      
      // 檢查項目是否存在
      const itemQuery = `SELECT * FROM inventory_items WHERE id = $1`;
      const itemResult = await db.query(itemQuery, [itemId]);
      
      if (itemResult.rows.length === 0) {
        return res.status(404).json({ message: '找不到該庫存項目' });
      }
      
      const item = itemResult.rows[0];
      
      // 檢查出庫操作是否有足夠庫存
      if (transaction_type === 'out' && item.current_quantity < quantity) {
        return res.status(400).json({ 
          message: '庫存不足',
          current: item.current_quantity,
          requested: quantity
        });
      }
      
      // 新增交易記錄
      const transactionQuery = `
        INSERT INTO inventory_transactions
        (inventory_item_id, transaction_type, quantity, user_id, requester_name, purpose, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        itemId,
        transaction_type,
        quantity,
        req.user.id,
        requester_name || null,
        purpose || null,
        notes || null
      ];
      
      const result = await db.query(transactionQuery, values);
      
      // 獲取更新後的項目
      const updatedItemQuery = `SELECT * FROM inventory_items WHERE id = $1`;
      const updatedResult = await db.query(updatedItemQuery, [itemId]);
      
      res.json({
        transaction: result.rows[0],
        item: updatedResult.rows[0]
      });
    } catch (error) {
      console.error('調整庫存數量失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 生成並保存QR Code
  async generateAndSaveQRCode(itemId, productId) {
    try {
      // 創建QR Code的資料內容 (使用URL格式，方便掃描後導向)
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const qrData = `${baseUrl}/inventory/${itemId}?productId=${productId}`;
      
      // 確保目錄存在
      const qrDir = path.join(__dirname, '../../public/qrcodes');
      await fs.mkdir(qrDir, { recursive: true });
      
      // 檔案路徑
      const fileName = `inventory_${productId.replace(/\//g, '_')}.png`;
      const filePath = path.join(qrDir, fileName);
      
      // 生成QR Code
      await QRCode.toFile(filePath, qrData, {
        color: {
          dark: '#000',
          light: '#FFF'
        },
        width: 300,
        margin: 1
      });
      
      // 更新資料庫中的QR Code URL
      const qrCodeUrl = `/qrcodes/${fileName}`;
      const updateQuery = `
        UPDATE inventory_items 
        SET qr_code_url = $1
        WHERE id = $2
      `;
      
      await db.query(updateQuery, [qrCodeUrl, itemId]);
      
      return qrCodeUrl;
    } catch (error) {
      console.error('生成QR Code失敗:', error);
      return null;
    }
  },

  // 獲取低庫存項目
  async getLowStockItems(req, res) {
    try {
      const query = `
        SELECT * FROM inventory_items
        WHERE current_quantity <= min_quantity AND min_quantity > 0
        ORDER BY category, product_name
      `;

      const result = await db.query(query);
      
      res.json(result.rows);
    } catch (error) {
      console.error('獲取低庫存項目失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 獲取庫存交易歷史
  async getTransactionHistory(req, res) {
    const { startDate, endDate, type, itemId } = req.query;

    try {
      let query = `
        SELECT t.*, i.product_id, i.product_name, i.unit, u.username
        FROM inventory_transactions t
        JOIN inventory_items i ON t.inventory_item_id = i.id
        LEFT JOIN users u ON t.user_id = u.id
        WHERE 1=1
      `;
      
      const values = [];
      let paramIndex = 1;
      
      if (startDate && endDate) {
        query += ` AND t.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        values.push(startDate, endDate);
        paramIndex += 2;
      }
      
      if (type) {
        query += ` AND t.transaction_type = $${paramIndex}`;
        values.push(type);
        paramIndex++;
      }
      
      if (itemId) {
        query += ` AND t.inventory_item_id = $${paramIndex}`;
        values.push(itemId);
        paramIndex++;
      }
      
      query += ` ORDER BY t.created_at DESC`;
      
      const result = await db.query(query, values);
      
      res.json(result.rows);
    } catch (error) {
      console.error('獲取庫存交易歷史失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 从工作日誌同步庫存消耗
  async syncFromWorkLog(req, res) {
    const { workLogId } = req.params;

    try {
      // 獲取工作日誌資訊
      const workLogQuery = `
        SELECT * FROM work_logs WHERE id = $1
      `;
      const workLogResult = await db.query(workLogQuery, [workLogId]);
      
      if (workLogResult.rows.length === 0) {
        return res.status(404).json({ message: '找不到該工作日誌' });
      }
      
      const workLog = workLogResult.rows[0];
      
      // 檢查是否有產品使用記錄
      if (!workLog.product_id) {
        return res.status(400).json({ message: '此工作日誌沒有相關聯的產品使用記錄' });
      }
      
      // 查找對應的庫存項目
      const inventoryQuery = `
        SELECT * FROM inventory_items WHERE product_id = $1
      `;
      const inventoryResult = await db.query(inventoryQuery, [workLog.product_id]);
      
      if (inventoryResult.rows.length === 0) {
        return res.status(404).json({ message: '找不到對應的庫存項目' });
      }
      
      const inventoryItem = inventoryResult.rows[0];
      
      // 查詢是否已經同步過
      const checkQuery = `
        SELECT * FROM inventory_transactions 
        WHERE work_log_id = $1
      `;
      const checkResult = await db.query(checkQuery, [workLogId]);
      
      if (checkResult.rows.length > 0) {
        return res.status(400).json({ message: '此工作日誌已經同步過庫存消耗' });
      }
      
      // 創建交易記錄
      const quantity = parseFloat(workLog.product_quantity) || 0;
      
      if (quantity <= 0) {
        return res.status(400).json({ message: '產品使用數量必須大於0' });
      }
      
      // 檢查庫存是否足夠
      if (inventoryItem.current_quantity < quantity) {
        return res.status(400).json({ 
          message: '庫存不足',
          current: inventoryItem.current_quantity,
          requested: quantity
        });
      }
      
      // 新增交易記錄
      const transactionQuery = `
        INSERT INTO inventory_transactions
        (inventory_item_id, transaction_type, quantity, user_id, purpose, notes, work_log_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        inventoryItem.id,
        'out',
        quantity,
        workLog.user_id,
        '工作日誌同步',
        `從工作日誌 ID: ${workLogId} 同步`,
        workLogId
      ];
      
      const result = await db.query(transactionQuery, values);
      
      // 獲取更新後的項目
      const updatedItemQuery = `SELECT * FROM inventory_items WHERE id = $1`;
      const updatedResult = await db.query(updatedItemQuery, [inventoryItem.id]);
      
      res.json({
        transaction: result.rows[0],
        item: updatedResult.rows[0]
      });
    } catch (error) {
      console.error('從工作日誌同步庫存消耗失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 批量更新产品從產品列表
  async syncFromProductList(req, res) {
    try {
      // 獲取產品列表
      const productsQuery = `
        SELECT 商品編號 as product_id, 規格, 單位
        FROM products
        WHERE 商品編號 IS NOT NULL
      `;
      
      const productsResult = await db.query(productsQuery);
      const products = productsResult.rows;
      
      // 遍歷產品列表，檢查是否需要新增庫存項目
      const result = {
        created: 0,
        updated: 0,
        skipped: 0,
        details: []
      };
      
      for (const product of products) {
        // 查詢是否已存在該產品的庫存項目
        const checkQuery = `
          SELECT * FROM inventory_items WHERE product_id = $1
        `;
        const checkResult = await db.query(checkQuery, [product.product_id]);
        
        if (checkResult.rows.length === 0) {
          // 創建新項目
          const category = this.getCategoryFromProductId(product.product_id);
          const name = product.規格 || product.product_id;
          const unit = product.單位 || '個';
          
          const insertQuery = `
            INSERT INTO inventory_items 
            (product_id, product_name, category, unit, current_quantity, min_quantity)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
          `;
          
          const values = [
            product.product_id,
            name,
            category,
            unit,
            0, // 初始庫存為0
            category === '資材' || category === '肥料' || category === '飼料' ? 10 : 0 // 資材、肥料和飼料的最低庫存設為10
          ];
          
          const insertResult = await db.query(insertQuery, values);
          const newItemId = insertResult.rows[0].id;
          
          // 生成QR Code
          await this.generateAndSaveQRCode(newItemId, product.product_id);
          
          result.created++;
          result.details.push({ 
            action: 'created',
            product_id: product.product_id,
            name
          });
        } else {
          // 已存在，檢查是否需要更新
          const existingItem = checkResult.rows[0];
          let needUpdate = false;
          const updateFields = {};
          
          if (product.規格 && existingItem.product_name !== product.規格) {
            updateFields.product_name = product.規格;
            needUpdate = true;
          }
          
          if (product.單位 && existingItem.unit !== product.單位) {
            updateFields.unit = product.單位;
            needUpdate = true;
          }
          
          if (needUpdate) {
            // 更新項目
            let updateQuery = `UPDATE inventory_items SET `;
            const updateValues = [];
            let paramIndex = 1;
            
            Object.entries(updateFields).forEach(([key, value], index) => {
              updateQuery += `${index > 0 ? ', ' : ''}${key} = $${paramIndex}`;
              updateValues.push(value);
              paramIndex++;
            });
            
            updateQuery += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`;
            updateValues.push(existingItem.id);
            
            await db.query(updateQuery, updateValues);
            
            result.updated++;
            result.details.push({ 
              action: 'updated',
              product_id: product.product_id,
              fields: updateFields
            });
          } else {
            result.skipped++;
          }
        }
      }
      
      res.json(result);
    } catch (error) {
      console.error('批量更新庫存項目失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 根據產品ID獲取類別
  getCategoryFromProductId(productId) {
    if (!productId || typeof productId !== 'string') return '其他';
    
    const categoryMap = {
      '2801': '葉菜類',
      '2802': '水果類',
      '2803': '瓜果類',
      '2804': '家禽類',
      '2805': '魚類',
      '2806': '加工品類',
      '2807': '葉菜種子種苗',
      '2808': '水果種子種苗',
      '2809': '肥料',
      '2810': '資材',
      '2811': '飼料',
    };
    
    // 嘗試匹配前四位數字
    const prefix = productId.substring(0, 4);
    return categoryMap[prefix] || '其他';
  }
};

module.exports = InventoryController;