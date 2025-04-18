const fs = require('fs');
const { parse } = require('csv-parse');
const { Pool } = require('pg');
const path = require('path');
const iconv = require('iconv-lite');

// 數據庫配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'shen_nong_worklog',
  password: '1qazXSW@',
  port: 5432,
});

// CSV 文件路徑
const csvFilePath = path.join(__dirname, '../data/庫存表.csv');

// 讀取並解析 CSV 文件
const fileContent = fs.readFileSync(csvFilePath);
const decodedContent = iconv.decode(fileContent, 'big5');

parse(decodedContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  delimiter: ',',
  from_line: 1
}, async (err, records) => {
  if (err) {
    console.error('Error parsing CSV:', err);
    pool.end();
    return;
  }

  try {
    // 開始一個事務
    const client = await pool.connect();
    console.log('Successfully connected to database');
    
    try {
      await client.query('BEGIN');
      console.log('Starting transaction...');

      for (const row of records) {
        try {
          // 檢查是否已存在該產品
          const checkResult = await client.query(
            'SELECT id FROM inventory_items WHERE product_id = $1',
            [row['商品編號']]
          );

          if (checkResult.rows.length > 0) {
            // 更新現有項目
            await client.query(
              `UPDATE inventory_items 
               SET current_quantity = $1,
                   updated_at = CURRENT_TIMESTAMP
               WHERE product_id = $2`,
              [parseFloat(row['可銷售庫存']), row['商品編號']]
            );
            console.log(`Updated item: ${row['商品編號']}`);
          } else {
            // 插入新項目
            const result = await client.query(
              `INSERT INTO inventory_items 
               (product_id, product_name, unit, current_quantity, category, min_quantity)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id`,
              [
                row['商品編號'],
                row['品名規格、品牌'],
                row['單位'],
                parseFloat(row['可銷售庫存']),
                row['商品編號'].startsWith('2804') ? '肉品' : '其他',
                0
              ]
            );

            // 添加初始庫存交易記錄
            await client.query(
              `INSERT INTO inventory_transactions 
               (inventory_item_id, transaction_type, quantity, purpose, notes)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                result.rows[0].id,
                'adjust',
                parseFloat(row['可銷售庫存']),
                '初始庫存設定',
                'CSV檔案匯入'
              ]
            );
            console.log(`Inserted new item: ${row['商品編號']}`);
          }
        } catch (err) {
          console.error(`Error processing row ${row['商品編號']}:`, err);
          throw err; // 重新拋出錯誤以觸發回滾
        }
      }

      // 提交事務
      await client.query('COMMIT');
      console.log('All data imported successfully');
    } catch (err) {
      // 如果出現錯誤，回滾事務
      await client.query('ROLLBACK');
      console.error('Transaction failed:', err);
    } finally {
      // 釋放客戶端
      client.release();
      // 關閉連接池
      pool.end();
    }
  } catch (err) {
    console.error('Database connection error:', err);
    pool.end();
  }
}); 