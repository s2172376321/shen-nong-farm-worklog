-- 15_add_user_status_fields.sql
DO $$
BEGIN
    -- 添加 is_active 欄位
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;

    -- 添加 last_login 欄位
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_login'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    END IF;

    -- 添加 department 欄位
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'department'
    ) THEN
        ALTER TABLE users ADD COLUMN department VARCHAR(100);
    END IF;

    -- 添加 position 欄位
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'position'
    ) THEN
        ALTER TABLE users ADD COLUMN position VARCHAR(100);
    END IF;

    -- 更新現有用戶的預設值
    UPDATE users
    SET 
        is_active = TRUE,
        department = COALESCE(department, '未設定'),
        position = COALESCE(position, '未設定')
    WHERE id IS NOT NULL;

EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in 15_add_user_status_fields.sql: %', SQLERRM;
END $$; 