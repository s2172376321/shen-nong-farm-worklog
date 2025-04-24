-- 14_add_user_fields.sql
DO $$
BEGIN
    -- 添加缺失的欄位
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS department VARCHAR(100),
    ADD COLUMN IF NOT EXISTS position VARCHAR(100);

    -- 更新現有用戶的預設值
    UPDATE users
    SET name = username,
        department = '未設定',
        position = '未設定'
    WHERE name IS NULL;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in 14_add_user_fields.sql: %', SQLERRM;
END $$; 