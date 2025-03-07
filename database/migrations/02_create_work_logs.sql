-- 02_create_work_logs.sql
DO $$
BEGIN
    -- 只有在表不存在時才創建
    IF NOT EXISTS (SELECT FROM information_schema.tables 
                   WHERE table_name = 'work_logs') THEN
        CREATE TABLE work_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id),
            location VARCHAR(100) NOT NULL,
            crop VARCHAR(50) NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            work_categories work_category[] NOT NULL,
            details TEXT,
            harvest_quantity DECIMAL(10, 2),
            status work_log_status DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP WITH TIME ZONE,
            reviewer_id UUID REFERENCES users(id),
            
            CONSTRAINT check_time_range CHECK (start_time < end_time)
        );

        -- 建立索引
        CREATE INDEX IF NOT EXISTS idx_work_logs_user ON work_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_work_logs_status ON work_logs(status);
        CREATE INDEX IF NOT EXISTS idx_work_logs_created_at ON work_logs(created_at);
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in 02_create_work_logs.sql: %', SQLERRM;
END $$;

-- 創建工作日誌統計視圖（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' AND table_name = 'work_log_summary'
    ) THEN
        CREATE OR REPLACE VIEW work_log_summary AS
        SELECT 
            user_id,
            COUNT(*) as total_logs,
            SUM(harvest_quantity) as total_harvest,
            AVG(EXTRACT(EPOCH FROM (end_time - start_time))/3600) as avg_work_hours,
            ARRAY_AGG(DISTINCT crop) as unique_crops
        FROM 
            work_logs
        GROUP BY 
            user_id;
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating work_log_summary view: %', SQLERRM;
END $$;