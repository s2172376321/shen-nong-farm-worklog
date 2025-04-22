const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'shen_nong_worklog',
  password: process.env.DB_PASSWORD || '123456',
  port: process.env.DB_PORT || 5432,
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database initialization...');
    
    // Read and execute the inventory tables initialization script
    const initScript = fs.readFileSync(
      path.join(__dirname, 'init_inventory_tables.sql'),
      'utf8'
    );
    
    await client.query(initScript);
    console.log('Inventory tables initialized successfully');
    
    // Add some test data if needed
    const testData = await client.query(`
      INSERT INTO inventory_items 
      (product_id, product_name, current_quantity, min_quantity, unit, category, description)
      VALUES 
        ('TEST001', '測試產品1', 100.00, 10.00, '個', '測試', '測試產品1的描述'),
        ('TEST002', '測試產品2', 50.00, 5.00, '公斤', '測試', '測試產品2的描述')
      ON CONFLICT (product_id) DO NOTHING
      RETURNING *;
    `);
    
    console.log('Test data added:', testData.rows);
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase()
  .then(() => {
    console.log('Database initialization completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }); 