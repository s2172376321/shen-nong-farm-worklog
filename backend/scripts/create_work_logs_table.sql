-- 位置：backend/scripts/migrations/create_work_logs_table.sql

-- Drop table if it exists (only for development)
-- DROP TABLE IF EXISTS work_logs;

-- Create the work_logs table with the updated schema
CREATE TABLE IF NOT EXISTS work_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  location_code VARCHAR(20) NOT NULL,
  position_code VARCHAR(20) NOT NULL,
  position_name VARCHAR(100) NOT NULL,
  work_category_code VARCHAR(20) NOT NULL,
  work_category_name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  details TEXT,
  harvest_quantity DECIMAL(10, 2) DEFAULT 0,
  product_id VARCHAR(50),
  product_name VARCHAR(200),
  product_quantity DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewer_id INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for frequent queries
CREATE INDEX IF NOT EXISTS work_logs_user_id_idx ON work_logs(user_id);
CREATE INDEX IF NOT EXISTS work_logs_created_at_idx ON work_logs(created_at);
CREATE INDEX IF NOT EXISTS work_logs_status_idx ON work_logs(status);