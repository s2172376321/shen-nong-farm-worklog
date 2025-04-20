const db = require('./config/database');

async function checkTables() {
  try {
    // 檢查 users 表是否存在
    const tableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `;
    const tableExists = await db.query(tableQuery);
    console.log('users 表是否存在:', tableExists.rows[0].exists);

    if (tableExists.rows[0].exists) {
      // 獲取表結構
      const columnsQuery = `
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users';
      `;
      const columns = await db.query(columnsQuery);
      console.log('\nusers 表結構:');
      console.table(columns.rows);

      // 檢查表中的記錄數
      const countQuery = 'SELECT COUNT(*) FROM users;';
      const count = await db.query(countQuery);
      console.log('\n用戶總數:', count.rows[0].count);
    } else {
      // 如果表不存在，創建表
      console.log('users 表不存在，正在創建...');
      const createTableQuery = `
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE,
          password_hash VARCHAR(255),
          name VARCHAR(100),
          department VARCHAR(100),
          position VARCHAR(100),
          role VARCHAR(20) DEFAULT 'user',
          google_id VARCHAR(255) UNIQUE,
          google_email VARCHAR(255),
          profile_image_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await db.query(createTableQuery);
      console.log('users 表創建成功');
    }
  } catch (error) {
    console.error('檢查數據庫表時發生錯誤:', error);
  } finally {
    // 關閉數據庫連接
    await db.close();
  }
}

checkTables(); 