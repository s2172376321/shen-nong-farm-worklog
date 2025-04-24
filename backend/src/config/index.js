require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5004,
  database: {
    name: process.env.DB_NAME || 'shen_nong_worklog',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432
  },
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  nodeEnv: process.env.NODE_ENV || 'development'
}; 