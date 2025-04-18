-- 08_create_work_log_attachments.sql

-- 創建工單附件表
DO $$
BEGIN
    -- 只有在表不存在時才創建
    IF NOT EXISTS (SELECT FROM information_schema.tables 
                   WHERE table_name = 'work_log_attachments') THEN
        CREATE TABLE work_log_attachments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            work_log_id UUID NOT NULL REFERENCES work_logs(id) ON DELETE CASCADE,
            file_name VARCHAR(255) NOT NULL,
            file_path TEXT NOT NULL,
            file_type VARCHAR(50) NOT NULL,
            file_size INTEGER NOT NULL,
            uploaded_by UUID NOT NULL REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- 建立索引
        CREATE INDEX idx_attachments_work_log ON work_log_attachments(work_log_id);
        CREATE INDEX idx_attachments_uploaded_by ON work_log_attachments(uploaded_by);
        CREATE INDEX idx_attachments_created_at ON work_log_attachments(created_at);
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in 08_create_work_log_attachments.sql: %', SQLERRM;
END $$;

-- 添加工作日誌表的索引
DO $$
BEGIN
    -- 創建複合索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_work_logs_date_status') THEN
        CREATE INDEX idx_work_logs_date_status ON work_logs(created_at, status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_work_logs_user_date') THEN
        CREATE INDEX idx_work_logs_user_date ON work_logs(user_id, created_at);
    END IF;
END $$; 