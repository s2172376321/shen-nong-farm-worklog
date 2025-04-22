-- 14_update_username_constraint.sql
DO $$
BEGIN
    -- 先删除旧的约束
    ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS username_format_check;

    -- 添加新的用户名验证规则（允许字母、数字、下划线和连字符）
    ALTER TABLE users 
    ADD CONSTRAINT username_format_check 
    CHECK (username ~ '^[a-zA-Z0-9_.-]+$');
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in 14_update_username_constraint.sql: %', SQLERRM;
END $$; 