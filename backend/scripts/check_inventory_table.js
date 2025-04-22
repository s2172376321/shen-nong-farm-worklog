const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'shen_nong_worklog',
  password: process.env.DB_PASSWORD || '123456',
  port: process.env.DB_PORT || 5432,
});

async function checkInventoryTable() {
  const client = await pool.connect();
  
  try {
    console.log('Checking inventory_items table structure...');
    
    // Get detailed column information
    const columnsResult = await client.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        is_identity
      FROM information_schema.columns
      WHERE table_name = 'inventory_items'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nInventory items table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`
Column: ${col.column_name}
Type: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}
Nullable: ${col.is_nullable}
Default: ${col.column_default}
Identity: ${col.is_identity}
      `);
    });
    
    // Check constraints
    const constraintsResult = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'inventory_items';
    `);
    
    console.log('\nConstraints:');
    constraintsResult.rows.forEach(con => {
      console.log(`${con.constraint_type} constraint '${con.constraint_name}' on column '${con.column_name}'`);
    });
    
  } catch (error) {
    console.error('Error checking inventory table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkInventoryTable()
  .then(() => {
    console.log('Inventory table check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Inventory table check failed:', error);
    process.exit(1);
  }); 