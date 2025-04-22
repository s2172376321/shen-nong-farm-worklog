-- 確保 uuid-ossp 擴展已安裝
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 備份現有數據（如果有的話）
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;

-- 刪除相關的外鍵約束
ALTER TABLE IF EXISTS work_logs 
    DROP CONSTRAINT IF EXISTS work_logs_user_id_fkey;

-- 刪除現有表
DROP TABLE IF EXISTS users;

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

-- 恢復外鍵約束
ALTER TABLE IF EXISTS work_logs
    ADD CONSTRAINT work_logs_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;

-- 創建測試用戶
INSERT INTO users (
    username,
    email,
    password_hash,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
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
    username,
    email,
    password_hash,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    'admin',
    'admin@shennong.farm',
    '$2a$10$jHkUV0nF8EPxqGl/KnFo0OzX4kULitoAfXQq9Uv3PNcJmjKYNJCIu',
    'admin',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING; 