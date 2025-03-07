-- 03_create_notices.sql
-- 檢查並創建notices表
DO $$
BEGIN
    -- 只有在表不存在時才創建
    IF NOT EXISTS (SELECT FROM information_schema.tables 
                   WHERE table_name = 'notices') THEN
        CREATE TABLE notices (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title VARCHAR(200) NOT NULL,
            content TEXT NOT NULL,
            author_id UUID NOT NULL REFERENCES users(id),
            priority INTEGER DEFAULT 1,
            is_pinned BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE,
            attachment_url TEXT
        );

        -- 建立索引
        CREATE INDEX idx_notices_author ON notices(author_id);
        CREATE INDEX idx_notices_priority ON notices(priority);
        CREATE INDEX idx_notices_expiration ON notices(expires_at);
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in 03_create_notices.sql: %', SQLERRM;
END $$;

-- 創建公告過濾函數
CREATE OR REPLACE FUNCTION filter_expired_notices()
RETURNS TRIGGER AS $$
BEGIN
    -- 刪除已過期且非置頂的公告
    DELETE FROM notices 
    WHERE expires_at < CURRENT_TIMESTAMP 
      AND is_pinned = FALSE;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 創建觸發器（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'notices' 
        AND trigger_name = 'remove_expired_notices'
    ) THEN
        CREATE TRIGGER remove_expired_notices
        AFTER INSERT OR UPDATE ON notices
        EXECUTE FUNCTION filter_expired_notices();
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating notices trigger: %', SQLERRM;
END $$;