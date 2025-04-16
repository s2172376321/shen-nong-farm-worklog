-- 位置：backend/scripts/migrations/create_work_logs_table.sql

-- Drop table if it exists (only for development)
-- DROP TABLE IF EXISTS work_logs;

-- 確保 UUID 擴展已安裝
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the work_logs table with the updated schema
CREATE TABLE IF NOT EXISTS work_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
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
  reviewer_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for frequent queries
CREATE INDEX IF NOT EXISTS work_logs_user_id_idx ON work_logs(user_id);
CREATE INDEX IF NOT EXISTS work_logs_created_at_idx ON work_logs(created_at);
CREATE INDEX IF NOT EXISTS work_logs_status_idx ON work_logs(status);