// 位置：backend/controllers/inventoryController.js
const db = require('../config/database');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const { validateInventoryItem } = require('../utils/validation');
const csv = require('csv');

// 添加日誌輔助函數
const logOperation = (operation, details) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 庫存操作 - ${operation}`);
  if (details) {
    console.log(JSON.stringify(details, null, 2));
  }
};

const InventoryController = {
  // 獲取所有庫存項目
  async getAllItems(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          id,
          name,
          code,
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

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('獲取庫存項目失敗:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 獲取單一庫存項目詳情
  async getItemDetails(req, res) {
    const { itemId } = req.params;

    // 驗證UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!itemId || !uuidRegex.test(itemId)) {
      return res.status(400).json({
        success: false,
        message: '無效的庫存項目ID格式'
      });
    }

    try {
      // 使用單一查詢獲取所有需要的數據
      const query = `
        WITH item_data AS (
          SELECT 
            i.*,
            COALESCE(
              (SELECT SUM(quantity) 
               FROM inventory_transactions 
               WHERE inventory_item_id = i.id AND transaction_type = 'in'),
              0
            ) as total_in,
            COALESCE(
              (SELECT SUM(quantity) 
               FROM inventory_transactions 
               WHERE inventory_item_id = i.id AND transaction_type = 'out'),
              0
            ) as total_out
          FROM inventory_items i
          WHERE i.id = $1
        ),
        transaction_data AS (
          SELECT 
            t.*,
            u.username,
            u.display_name as user_display_name
          FROM inventory_transactions t
          LEFT JOIN users u ON t.user_id = u.id
          WHERE t.inventory_item_id = $1
          ORDER BY t.created_at DESC
          LIMIT 100
        )
        SELECT 
          json_build_object(
            'item', (SELECT row_to_json(item_data) FROM item_data),
            'transactions', COALESCE(
              (SELECT json_agg(t) FROM transaction_data t),
              '[]'::json
            )
          ) as result
      `;
      
      const result = await db.query(query, [itemId]);
      
      if (!result.rows[0] || !result.rows[0].result || !result.rows[0].result.item) {
        return res.status(404).json({ 
          success: false,
          message: '找不到該庫存項目'
        });
      }
      
      // 格式化數據
      const data = result.rows[0].result;
      data.item.current_quantity = parseFloat(data.item.current_quantity).toFixed(2);
      data.item.min_quantity = parseFloat(data.item.min_quantity).toFixed(2);
      
      // 格式化交易記錄中的數量
      if (data.transactions) {
        data.transactions = data.transactions.map(t => ({
          ...t,
          quantity: parseFloat(t.quantity).toFixed(2)
        }));
      }

      res.json({
        success: true,
        ...data
      });
    } catch (error) {
      console.error('獲取庫存項目詳情失敗:', error);
      res.status(500).json({ 
        success: false,
        message: '獲取庫存項目詳情失敗，請稍後再試',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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
      unit,
      current_quantity
    } = req.body;

    try {
      logOperation('開始創建新庫存項目', {
        產品編號: product_id,
        產品名稱: product_name,
        單位: unit,
        初始數量: current_quantity
      });
      
      // 檢查是否已存在相同產品ID的項目
      const checkQuery = `SELECT id FROM inventory_items WHERE product_id = $1`;
      const checkResult = await db.query(checkQuery, [product_id]);
      
      if (checkResult.rows.length > 0) {
        logOperation('創建失敗：產品編號重複', {
          產品編號: product_id,
          已存在ID: checkResult.rows[0].id
        });
        return res.status(400).json({ message: '已存在相同產品ID的庫存項目' });
      }
      
      // 插入新項目
      const insertQuery = `
        INSERT INTO inventory_items 
        (product_id, product_name, unit, current_quantity)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const values = [
        product_id,
        product_name,
        unit || '個',
        current_quantity || 0
      ];
      
      logOperation('執行資料庫插入', { SQL參數: values });
      
      const result = await db.query(insertQuery, values);
      const newItem = result.rows[0];
      
      logOperation('新項目創建成功', {
        項目ID: newItem.id,
        產品編號: newItem.product_id,
        產品名稱: newItem.product_name
      });
      
      res.status(201).json(newItem);
    } catch (error) {
      logOperation('創建庫存項目失敗', {
        錯誤訊息: error.message,
        錯誤堆疊: error.stack,
        請求數據: req.body
      });
      
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 更新庫存項目
  async updateItem(req, res) {
    const { itemId } = req.params;
    const { 
      product_name,
      unit,
      current_quantity
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
          unit = COALESCE($2, unit),
          current_quantity = COALESCE($3, current_quantity)
        WHERE id = $4
        RETURNING *
      `;
      
      const values = [
        product_name,
        unit,
        current_quantity,
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

    const client = await db.connect();

    try {
      logOperation('開始調整庫存數量', {
        項目ID: itemId,
        交易類型: transaction_type,
        調整數量: quantity,
        申請人: requester_name,
        用途: purpose
      });
      
      await client.query('BEGIN');

      // 驗證交易類型
      if (!['in', 'out', 'adjust'].includes(transaction_type)) {
        throw new Error('無效的交易類型');
      }
      
      // 檢查數量是否有效
      if (typeof quantity !== 'number' || quantity <= 0) {
        throw new Error('數量必須是大於0的數字');
      }
      
      // 檢查項目是否存在並獲取當前庫存
      const itemQuery = `SELECT * FROM inventory_items WHERE id = $1 FOR UPDATE`;
      const itemResult = await client.query(itemQuery, [itemId]);
      
      if (itemResult.rows.length === 0) {
        throw new Error('找不到該庫存項目');
      }
      
      const item = itemResult.rows[0];
      
      logOperation('當前庫存狀態', {
        產品編號: item.product_id,
        產品名稱: item.product_name,
        當前數量: item.current_quantity
      });
      
      // 檢查庫存操作的有效性
      if (transaction_type === 'out' && item.current_quantity < quantity) {
        throw new Error(`庫存不足 (現有: ${item.current_quantity}, 需要: ${quantity})`);
      }
      
      if (transaction_type === 'adjust' && (item.current_quantity + quantity) < 0) {
        throw new Error(`調整後庫存量不能為負數 (現有: ${item.current_quantity}, 調整: ${quantity})`);
      }
      
      // 新增交易記錄
      const transactionQuery = `
        INSERT INTO inventory_transactions
        (inventory_id, transaction_type, quantity, user_id, requester_name, purpose, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      logOperation('執行庫存交易', {
        交易類型: transaction_type,
        調整數量: quantity,
        調整前數量: item.current_quantity,
        調整後數量: transaction_type === 'in' 
          ? item.current_quantity + quantity
          : transaction_type === 'out'
          ? item.current_quantity - quantity
          : item.current_quantity + quantity
      });
      
      const values = [
        itemId,
        transaction_type,
        quantity,
        req.user.id,
        requester_name || null,
        purpose || null,
        notes || null
      ];
      
      const result = await client.query(transactionQuery, values);
      
      // 獲取更新後的項目
      const updatedItemQuery = `SELECT * FROM inventory_items WHERE id = $1`;
      const updatedResult = await client.query(updatedItemQuery, [itemId]);
      
      await client.query('COMMIT');
      
      logOperation('庫存調整完成', {
        交易記錄: result.rows[0],
        更新後狀態: updatedResult.rows[0]
      });
      
      res.json({
        transaction: result.rows[0],
        item: updatedResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logOperation('調整庫存數量失敗', {
        錯誤訊息: error.message,
        錯誤堆疊: error.stack,
        請求參數: {
          itemId,
          ...req.body
        }
      });
      res.status(400).json({ message: error.message || '伺服器錯誤，請稍後再試' });
    } finally {
      client.release();
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
      const result = await db.query(`
        SELECT 
          id,
          name,
          code,
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

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('獲取低庫存項目失敗:', error);
      res.status(500).json({ success: false, error: error.message });
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

  // 從工作日誌同步庫存消耗
  async syncFromWorkLog(req, res) {
    const { workLogId } = req.params;

    try {
      logOperation('開始從工作日誌同步庫存', {
        工作日誌ID: workLogId
      });
      
      // 獲取工作日誌資訊
      const workLogQuery = `
        SELECT * FROM work_logs WHERE id = $1
      `;
      const workLogResult = await db.query(workLogQuery, [workLogId]);
      
      if (workLogResult.rows.length === 0) {
        logOperation('同步失敗：找不到工作日誌', { workLogId });
        return res.status(404).json({ message: '找不到該工作日誌' });
      }
      
      const workLog = workLogResult.rows[0];
      logOperation('工作日誌資訊', {
        日誌ID: workLog.id,
        產品ID: workLog.product_id,
        使用數量: workLog.product_quantity
      });
      
      // 檢查是否有產品使用記錄
      if (!workLog.product_id || !workLog.product_quantity) {
        logOperation('同步跳過：工作日誌無產品使用記錄', {
          工作日誌ID: workLog.id,
          產品ID: workLog.product_id,
          使用數量: workLog.product_quantity
        });
        return res.json({ 
          message: '此工作日誌無產品使用記錄',
          synced: false 
        });
      }
      
      // 開始資料庫交易
      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        
        // 檢查庫存項目是否存在
        const checkItemQuery = `
          SELECT * FROM inventory_items 
          WHERE product_id = $1
        `;
        const itemResult = await client.query(checkItemQuery, [workLog.product_id]);
        
        if (itemResult.rows.length === 0) {
          logOperation('同步失敗：找不到對應的庫存項目', {
            工作日誌ID: workLog.id,
            產品ID: workLog.product_id
          });
          await client.query('ROLLBACK');
          return res.status(404).json({ 
            message: '找不到對應的庫存項目',
            synced: false 
          });
        }

        const inventoryItem = itemResult.rows[0];
        
        // 檢查是否已經同步過
        const checkSyncQuery = `
          SELECT * FROM inventory_transactions 
          WHERE work_log_id = $1
        `;
        const syncResult = await client.query(checkSyncQuery, [workLogId]);
        
        if (syncResult.rows.length > 0) {
          logOperation('同步跳過：已經同步過', {
            工作日誌ID: workLog.id,
            交易記錄ID: syncResult.rows[0].id
          });
          await client.query('ROLLBACK');
          return res.json({ 
            message: '此工作日誌已經同步過',
            synced: false,
            transaction: syncResult.rows[0]
          });
        }

        // 建立庫存交易記錄
        const transactionQuery = `
          INSERT INTO inventory_transactions
          (inventory_id, transaction_type, quantity, user_id, work_log_id, notes)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        
        const transactionValues = [
          inventoryItem.id,
          'out',
          workLog.product_quantity,
          req.user.id,
          workLogId,
          `從工作日誌 #${workLogId} 同步的庫存消耗`
        ];

        logOperation('建立庫存交易記錄', {
          庫存項目ID: inventoryItem.id,
          工作日誌ID: workLogId,
          消耗數量: workLog.product_quantity
        });
        
        const transactionResult = await client.query(transactionQuery, transactionValues);

        // 更新庫存數量
        const updateQuery = `
          UPDATE inventory_items 
          SET current_quantity = current_quantity - $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `;
        
        const updateResult = await client.query(updateQuery, [
          workLog.product_quantity,
          inventoryItem.id
        ]);

        await client.query('COMMIT');
        
        logOperation('同步完成', {
          工作日誌ID: workLog.id,
          交易記錄: transactionResult.rows[0],
          更新後庫存: updateResult.rows[0]
        });

        res.json({
          message: '同步成功',
          synced: true,
          transaction: transactionResult.rows[0],
          inventory: updateResult.rows[0]
        });
      } catch (error) {
        await client.query('ROLLBACK');
        logOperation('同步失敗', {
          工作日誌ID: workLog.id,
          錯誤訊息: error.message,
          錯誤堆疊: error.stack
        });
        res.status(500).json({ 
          message: '同步過程中發生錯誤',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
          synced: false 
        });
      } finally {
        client.release();
      }
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
  },

  // 創建庫存領用記錄
  async createInventoryCheckout(req, res) {
    const client = await db.connect();
    
    try {
      const {
        inventory_id,
        product_id,
        user_id,
        user_name,
        quantity,
        purpose,
        checkout_date
      } = req.body;

      // 驗證必填欄位
      if (!inventory_id || !product_id || !user_id || !user_name || !quantity || !purpose || !checkout_date) {
        return res.status(400).json({ message: '所有欄位都是必填的' });
      }

      // 開始事務
      await client.query('BEGIN');

      // 檢查庫存是否足夠
      const inventoryResult = await client.query(
        'SELECT current_quantity FROM inventory_items WHERE id = $1',
        [inventory_id]
      );

      if (inventoryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: '找不到指定的庫存項目' });
      }

      const currentQuantity = inventoryResult.rows[0].current_quantity;
      if (currentQuantity < quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: '庫存數量不足' });
      }

      // 創建領用記錄
      const result = await client.query(
        `INSERT INTO inventory_checkouts 
         (inventory_id, product_id, user_id, user_name, quantity, purpose, checkout_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [inventory_id, product_id, user_id, user_name, quantity, purpose, checkout_date]
      );

      // 提交事務
      await client.query('COMMIT');

      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('創建庫存領用記錄失敗:', error);
      res.status(500).json({ message: '創建庫存領用記錄失敗' });
    } finally {
      client.release();
    }
  },

  // 獲取庫存領用記錄
  async getInventoryCheckouts(req, res) {
    try {
      const {
        start_date,
        end_date,
        user_id,
        inventory_id,
        product_id,
        limit = 100,
        offset = 0
      } = req.query;

      let query = `
        SELECT c.*, i.product_name, i.unit
        FROM inventory_checkouts c
        LEFT JOIN inventory_items i ON c.inventory_id = i.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      // 添加過濾條件
      if (start_date) {
        query += ` AND c.checkout_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }
      if (end_date) {
        query += ` AND c.checkout_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }
      if (user_id) {
        query += ` AND c.user_id = $${paramCount}`;
        params.push(user_id);
        paramCount++;
      }
      if (inventory_id) {
        query += ` AND c.inventory_id = $${paramCount}`;
        params.push(inventory_id);
        paramCount++;
      }
      if (product_id) {
        query += ` AND c.product_id = $${paramCount}`;
        params.push(product_id);
        paramCount++;
      }

      // 添加排序和分頁
      query += ` ORDER BY c.checkout_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('獲取庫存領用記錄失敗:', error);
      res.status(500).json({ message: '獲取庫存領用記錄失敗' });
    }
  },

  // 根據產品ID獲取庫存項目
  async getInventoryItemByProductId(req, res) {
    try {
      const { productId } = req.params;
      
      const result = await db.query(
        'SELECT * FROM inventory_items WHERE product_id = $1',
        [productId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: '找不到指定的庫存項目' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('獲取庫存項目失敗:', error);
      res.status(500).json({ message: '獲取庫存項目失敗' });
    }
  },

  // 刪除庫存項目
  async deleteItem(req, res) {
    const { itemId } = req.params;

    try {
      const deleteQuery = 'DELETE FROM inventory_items WHERE id = $1 RETURNING *';
      const result = await db.query(deleteQuery, [itemId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: '找不到該庫存項目' });
      }

      res.json({ 
        message: '庫存項目已成功刪除',
        deletedItem: result.rows[0]
      });
    } catch (error) {
      console.error('刪除庫存項目失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 獲取庫存統計
  async getInventoryStats(req, res) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN quantity <= minimum_stock THEN 1 END) as low_stock_count,
          COUNT(DISTINCT category) as category_count,
          SUM(quantity) as total_quantity
        FROM inventory_items;
      `;

      const categoryStatsQuery = `
        SELECT 
          category,
          COUNT(*) as item_count,
          SUM(quantity) as total_quantity,
          COUNT(CASE WHEN quantity <= minimum_stock THEN 1 END) as low_stock_count
        FROM inventory_items
        GROUP BY category
        ORDER BY item_count DESC;
      `;

      const [statsResult, categoryStats] = await Promise.all([
        db.query(statsQuery),
        db.query(categoryStatsQuery)
      ]);

      const stats = statsResult.rows[0];
      
      res.json({
        success: true,
        stats: {
          ...stats,
          categories: categoryStats.rows
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

  // 導出庫存數據為 CSV
  async exportToCSV(req, res) {
    try {
      logOperation('開始導出庫存數據為 CSV');
      
      const query = `
        SELECT * FROM inventory_items
        ORDER BY product_name
      `;

      const result = await db.query(query);
      
      // 準備 CSV 內容
      const headers = [
        '商品編號',
        '商品名稱',
        '單位',
        '庫存量'
      ].join(',') + '\n';

      const rows = result.rows.map(item => [
        item.product_id || '',
        `"${(item.product_name || '').replace(/"/g, '""')}"`,
        `"${(item.unit || '個').replace(/"/g, '""')}"`,
        parseFloat(item.current_quantity || 0).toFixed(2)
      ].join(','));

      const csvContent = headers + rows.join('\n');
      
      // 設置 BOM 以確保 Excel 正確識別中文編碼
      const BOM = '\uFEFF';
      const csvData = BOM + csvContent;
      
      logOperation('CSV 導出完成', {
        總筆數: result.rows.length,
        檔案大小: csvData.length
      });

      // 設置響應頭
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=inventory-export-${new Date().toISOString().split('T')[0]}.csv`);
      
      // 發送 CSV 數據
      res.send(csvData);
    } catch (error) {
      logOperation('導出 CSV 失敗', {
        錯誤訊息: error.message,
        錯誤堆疊: error.stack
      });
      
      res.status(500).json({ 
        success: false,
        message: '導出 CSV 失敗，請稍後再試',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // 從 CSV 文件匯入庫存數據
  async importInventoryFromCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      let lineNumber = 0;
      
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
          lineNumber++;
          console.log(`處理第 ${lineNumber} 行數據:`, data);
          
          try {
            // 嘗試不同的列名格式
            const item = {
              product_id: data['商品編號'] || data['產品編號'] || data['編號'] || '',
              product_name: data['商品名稱'] || data['名稱'] || data['品名'] || '',
              current_quantity: parseFloat(data['現有庫存'] || data['庫存'] || data['數量'] || '0') || 0,
              unit: data['單位'] || data['計量單位'] || '個',
              category: data['類別'] || data['分類'] || data['種類'] || '其他',
              min_quantity: parseFloat(data['最低庫存'] || data['安全庫存'] || '0') || 0
            };

            // 驗證必填欄位
            const validationErrors = [];
            if (!item.product_id) validationErrors.push('商品編號為必填');
            if (!item.product_name) validationErrors.push('商品名稱為必填');
            if (item.current_quantity < 0) validationErrors.push('庫存數量不能為負數');
            if (item.min_quantity < 0) validationErrors.push('最低庫存不能為負數');

            if (validationErrors.length > 0) {
              errors.push({
                line: lineNumber,
                errors: validationErrors,
                data: item
              });
            } else {
              results.push(item);
            }
          } catch (error) {
            errors.push({
              line: lineNumber,
              errors: [`數據處理錯誤: ${error.message}`],
              data
            });
          }
        })
        .on('end', () => {
          console.log('CSV 文件讀取完成');
          console.log(`- 總行數: ${lineNumber}`);
          console.log(`- 有效記錄: ${results.length}`);
          console.log(`- 錯誤記錄: ${errors.length}`);
          
          if (errors.length > 0) {
            console.log('錯誤詳情:', JSON.stringify(errors, null, 2));
          }
          
          resolve({ results, errors });
        });
    });
  },

  // 匯入 CSV 數據
  async importCSV(req, res) {
    const client = await db.getClient();
    
    try {
      if (!req.file) {
        throw new Error('未上傳文件');
      }

      console.log('開始處理上傳的 CSV 文件:', req.file.path);
      const { results, errors } = await this.importInventoryFromCSV(req.file.path);
      
      if (results.length === 0) {
        throw new Error('CSV 文件中沒有有效的記錄');
      }

      await client.query('BEGIN');
      
      // 批量插入或更新數據
      for (const item of results) {
        const query = `
          INSERT INTO inventory_items 
          (product_id, product_name, current_quantity, unit, category, min_quantity)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (product_id) DO UPDATE SET
          product_name = EXCLUDED.product_name,
          current_quantity = EXCLUDED.current_quantity,
          unit = EXCLUDED.unit,
          category = EXCLUDED.category,
          min_quantity = EXCLUDED.min_quantity,
          updated_at = CURRENT_TIMESTAMP
        `;
        
        const values = [
          item.product_id,
          item.product_name,
          item.current_quantity,
          item.unit,
          item.category,
          item.min_quantity
        ];

        await client.query(query, values);
      }

      await client.query('COMMIT');

      // 刪除上傳的文件
      fs.unlinkSync(req.file.path);
      
      const response = {
        success: true,
        message: `成功導入 ${results.length} 條記錄`,
        errors: errors.length > 0 ? errors : undefined
      };

      console.log('CSV 導入完成:', response);
      res.json(response);
    } catch (error) {
      await client.query('ROLLBACK');
      
      console.error('導入 CSV 失敗:', error);
      res.status(500).json({ 
        success: false, 
        message: '導入失敗',
        error: error.message,
        details: errors
      });
    } finally {
      client.release();
    }
  }
};

module.exports = InventoryController;