-- 01_create_users.sql
DO $$
BEGIN
    -- 只有在表不存在時才創建
    IF NOT EXISTS (SELECT FROM information_schema.tables 
                   WHERE table_name = 'users') THEN
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
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

        -- 插入預設管理員帳號
        INSERT INTO users (username, email, password_hash, role) 
        VALUES (
            'admin', 
            'admin@shennong.farm', 
            '$2a$10$jHkUV0nF8EPxqGl/KnFo0OzX4kULitoAfXQq9Uv3PNcJmjKYNJCIu', 
            'admin'
        ) ON CONFLICT (email) DO NOTHING;
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in 01_create_users.sql: %', SQLERRM;
END $$;