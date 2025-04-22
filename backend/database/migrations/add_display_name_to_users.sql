-- 添加 display_name 列到 users 表
DO $$
BEGIN
    -- 檢查 display_name 列是否已存在
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'display_name'
    ) THEN
        -- 添加 display_name 列，並使用 username 作為預設值
        ALTER TABLE users 
        ADD COLUMN display_name VARCHAR(100);

        -- 更新現有記錄，將 username 複製到 display_name
        UPDATE users 
        SET display_name = username 
        WHERE display_name IS NULL;
    END IF;
END $$; 