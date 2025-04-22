const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'shen_nong_worklog',
  password: process.env.DB_PASSWORD || '123456',
  port: process.env.DB_PORT || 5432,
});

async function checkDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Checking database structure...');
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Existing tables:', tablesResult.rows.map(r => r.table_name));
    
    // Check inventory_items table structure if it exists
    if (tablesResult.rows.some(r => r.table_name === 'inventory_items')) {
      const columnsResult = await client.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'inventory_items'
      `);
      
      console.log('\nInventory items table columns:');
      columnsResult.rows.forEach(col => {
        console.log(`${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabase()
  .then(() => {
    console.log('Database check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database check failed:', error);
    process.exit(1);
  }); 