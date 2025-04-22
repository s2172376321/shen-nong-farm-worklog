-- 12_add_user_department_position.sql
DO $$
BEGIN
    -- 添加 department 列（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'department'
    ) THEN
        ALTER TABLE users ADD COLUMN department VARCHAR(100);
    END IF;

    -- 添加 position 列（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'position'
    ) THEN
        ALTER TABLE users ADD COLUMN position VARCHAR(100);
    END IF;

    -- 添加 name 列（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'name'
    ) THEN
        ALTER TABLE users ADD COLUMN name VARCHAR(100);
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in 12_add_user_department_position.sql: %', SQLERRM;
END $$; 