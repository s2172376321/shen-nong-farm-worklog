const { Sequelize } = require('sequelize');
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

async function checkDatabaseTables() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // 檢查數據庫信息
    const dbInfo = await sequelize.query(`
      SELECT current_database() as database_name, 
             current_user as user_name;
    `, { type: Sequelize.QueryTypes.SELECT });
    console.log('Database Info:', dbInfo[0]);

    // 列出所有表
    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `, { type: Sequelize.QueryTypes.SELECT });
    console.log('\nTables in database:', tables.map(t => t.table_name));

    // 檢查 users 表結構
    const columns = await sequelize.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users';
    `, { type: Sequelize.QueryTypes.SELECT });
    console.log('\nUsers table structure:', columns);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkDatabaseTables(); 