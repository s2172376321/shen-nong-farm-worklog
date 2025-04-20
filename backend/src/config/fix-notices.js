const db = require('./database');

async function fixNoticesTable() {
  try {
    // 檢查 is_read 列是否存在
    const checkColumnQuery = `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notices'
        AND column_name = 'is_read'
      );
    `;
    
    const { exists } = (await db.query(checkColumnQuery)).rows[0];
    
    if (!exists) {
      // 添加 is_read 列
      await db.query(`
        ALTER TABLE notices
        ADD COLUMN is_read BOOLEAN DEFAULT false;
      `);
      console.log('成功添加 is_read 列到 notices 表');
    } else {
      console.log('is_read 列已存在於 notices 表中');
    }
  } catch (error) {
    console.error('修復 notices 表時發生錯誤:', error);
  } finally {
    // 關閉數據庫連接
    await db.end();
  }
}

// 執行修復
fixNoticesTable(); 