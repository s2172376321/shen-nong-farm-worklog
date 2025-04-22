-- 檢查 name 列是否存在，如果不存在則添加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'name'
    ) THEN
        ALTER TABLE users
        ADD COLUMN name VARCHAR(255);
        
        -- 將 username 的值複製到 name 列作為初始值
        UPDATE users
        SET name = username
        WHERE name IS NULL;
    END IF;
END $$; 