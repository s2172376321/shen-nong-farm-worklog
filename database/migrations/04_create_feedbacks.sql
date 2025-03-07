-- 04_create_feedbacks.sql
DO $$
BEGIN
    -- 只有在表不存在時才創建
    IF NOT EXISTS (SELECT FROM information_schema.tables 
                   WHERE table_name = 'user_feedbacks') THEN
        CREATE TABLE user_feedbacks (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id),
            subject VARCHAR(100) NOT NULL,
            content TEXT NOT NULL,
            category VARCHAR(50),
            status VARCHAR(20) DEFAULT 'pending',
            priority INTEGER DEFAULT 3,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP WITH TIME ZONE,
            resolver_id UUID REFERENCES users(id)
        );

        -- 建立索引
        CREATE INDEX IF NOT EXISTS idx_feedbacks_user ON user_feedbacks(user_id);
        CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON user_feedbacks(status);
        CREATE INDEX IF NOT EXISTS idx_feedbacks_priority ON user_feedbacks(priority);
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in 04_create_feedbacks.sql: %', SQLERRM;
END $$;