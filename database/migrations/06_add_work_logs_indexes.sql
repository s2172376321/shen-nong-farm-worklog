-- 為 work_logs 表增加索引以提高查詢效能
-- 放置在 database/migrations 資料夾中，例如：database/migrations/06_add_work_logs_indexes.sql

-- 檢查並添加索引
DO $$
BEGIN
    -- 檢查並建立 created_at_idx 索引
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'work_logs' AND indexname = 'idx_work_logs_created_at'
    ) THEN
        CREATE INDEX idx_work_logs_created_at ON work_logs (created_at);
        RAISE NOTICE 'Created index idx_work_logs_created_at';
    END IF;

    -- 檢查並建立 status_idx 索引
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'work_logs' AND indexname = 'idx_work_logs_status'
    ) THEN
        CREATE INDEX idx_work_logs_status ON work_logs (status);
        RAISE NOTICE 'Created index idx_work_logs_status';
    END IF;

    -- 檢查並建立 user_id_status 複合索引
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'work_logs' AND indexname = 'idx_work_logs_user_id_status'
    ) THEN
        CREATE INDEX idx_work_logs_user_id_status ON work_logs (user_id, status);
        RAISE NOTICE 'Created index idx_work_logs_user_id_status';
    END IF;

    -- 檢查並建立 position_name 索引，改善按位置查詢
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'work_logs' AND indexname = 'idx_work_logs_position_name'
    ) THEN
        CREATE INDEX idx_work_logs_position_name ON work_logs (position_name);
        RAISE NOTICE 'Created index idx_work_logs_position_name';
    END IF;

    -- 檢查並建立 work_category_name 索引，改善按類別查詢
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'work_logs' AND indexname = 'idx_work_logs_work_category_name'
    ) THEN
        CREATE INDEX idx_work_logs_work_category_name ON work_logs (work_category_name);
        RAISE NOTICE 'Created index idx_work_logs_work_category_name';
    END IF;

    -- 檢查並建立包含日期的複合索引，用於日期範圍查詢
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'work_logs' AND indexname = 'idx_work_logs_created_at_date'
    ) THEN
        CREATE INDEX idx_work_logs_created_at_date ON work_logs (DATE(created_at));
        RAISE NOTICE 'Created index idx_work_logs_created_at_date';
    END IF;

EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating indexes: %', SQLERRM;
END $$;