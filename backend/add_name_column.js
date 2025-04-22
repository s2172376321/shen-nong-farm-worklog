const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'shen_nong_worklog',
  logging: false
});

async function addNameColumn() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // 讀取 SQL 文件
    const sql = fs.readFileSync(path.join(__dirname, 'sql', 'add_name_column.sql'), 'utf8');
    
    // 執行 SQL
    await sequelize.query(sql);
    console.log('Successfully added name column to users table');

    // 驗證列是否已添加
    const columns = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'name';
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log('\nVerification - name column details:', columns);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

addNameColumn(); 