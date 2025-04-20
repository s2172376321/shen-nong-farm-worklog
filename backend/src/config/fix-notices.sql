-- 檢查並添加 is_read 列
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notices'
        AND column_name = 'is_read'
    ) THEN
        ALTER TABLE notices
        ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;
END $$; 