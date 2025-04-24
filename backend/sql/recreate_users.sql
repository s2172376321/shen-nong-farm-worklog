-- 確保 uuid-ossp 擴展已安裝
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 創建 user_role 類型
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 刪除所有相關的外鍵約束
ALTER TABLE IF EXISTS work_logs 
    DROP CONSTRAINT IF EXISTS work_logs_user_id_fkey;

ALTER TABLE IF EXISTS notice_reads 
    DROP CONSTRAINT IF EXISTS notice_reads_user_id_fkey;

ALTER TABLE IF EXISTS notice_reads 
    DROP CONSTRAINT IF EXISTS notice_reads_notice_id_fkey;

-- 刪除所有相關的表
DROP TABLE IF EXISTS notice_reads CASCADE;
DROP TABLE IF EXISTS notices CASCADE;
DROP TABLE IF EXISTS work_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS users_backup CASCADE;

-- 重新創建表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user',
    google_id VARCHAR(255),
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 創建索引
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE UNIQUE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);

-- 創建測試用戶
INSERT INTO users (
    id,
    username,
    email,
    password_hash,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000', -- 使用固定的 UUID
    '1224',
    'test@example.com',
    '$2a$10$jHkUV0nF8EPxqGl/KnFo0OzX4kULitoAfXQq9Uv3PNcJmjKYNJCIu',
    'user',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 插入預設管理員帳號
INSERT INTO users (
    id,
    username,
    email,
    password_hash,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001', -- 使用固定的 UUID
    'admin',
    'admin@shennong.farm',
    '$2a$10$jHkUV0nF8EPxqGl/KnFo0OzX4kULitoAfXQq9Uv3PNcJmjKYNJCIu',
    'admin',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING; 