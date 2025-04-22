-- 確保 uuid-ossp 擴展已安裝
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 確保 user_role 類型存在
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'user');
    END IF;
END$$;

-- 創建測試用戶（密碼：5ji6gj94）
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
    uuid_generate_v4(),
    '1224',
    'test@example.com',
    '$2a$10$jHkUV0nF8EPxqGl/KnFo0OzX4kULitoAfXQq9Uv3PNcJmjKYNJCIu',  -- 使用相同的加密方式
    'user'::user_role,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) RETURNING id, username, email, role, created_at; 