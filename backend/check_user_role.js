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

async function checkUserRole() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    const result = await sequelize.query(
      'SELECT username, role FROM users WHERE username = :username',
      {
        replacements: { username: '1224' },
        type: Sequelize.QueryTypes.SELECT
      }
    );

    if (result.length > 0) {
      console.log('User found:', result[0]);
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkUserRole(); 