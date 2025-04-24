const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'shen_nong_farm',
  port: '5432',
  password: '1qazXSW@',
  ssl: false
});

async function checkDatabase() {
  try {
    // 檢查 users 表的結構
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('Users 表結構:');
    console.log(tableInfo.rows);

    // 檢查 users 表的數據
    const sampleData = await pool.query(`
      SELECT id, username, email, role
      FROM users
      LIMIT 5;
    `);

    console.log('\nUsers 表數據樣本:');
    console.log(sampleData.rows);

  } catch (error) {
    console.error('檢查資料庫時發生錯誤:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase(); 