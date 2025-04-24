const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkUsers() {
  try {
    // 檢查表結構
    const columnsResult = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM 
        information_schema.columns
      WHERE 
        table_name = 'users'
      ORDER BY 
        ordinal_position;
    `);

    console.log('\n用戶表結構:');
    console.table(columnsResult.rows);

    // 檢查用戶資料
    const usersResult = await pool.query(`
      SELECT 
        id,
        username,
        email,
        role,
        is_active,
        last_login,
        department,
        position,
        created_at,
        updated_at
      FROM 
        users
      ORDER BY 
        created_at DESC;
    `);

    console.log('\n用戶資料:');
    console.table(usersResult.rows);

  } catch (error) {
    console.error('檢查用戶資料時發生錯誤:', error);
  } finally {
    await pool.end();
  }
}

checkUsers(); 