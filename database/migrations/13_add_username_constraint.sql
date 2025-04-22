-- 13_add_username_constraint.sql
DO $$
BEGIN
    -- 添加用户名验证规则
    ALTER TABLE users 
    ADD CONSTRAINT username_format_check 
    CHECK (username ~ '^[a-zA-Z0-9]+$');
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in 13_add_username_constraint.sql: %', SQLERRM;
END $$; 