-- 備份 work_logs 表
CREATE TABLE work_logs_backup AS SELECT * FROM work_logs;

-- 刪除原有的外鍵約束（如果存在）
ALTER TABLE IF EXISTS work_logs 
    DROP CONSTRAINT IF EXISTS work_logs_user_id_fkey;

-- 修改 user_id 欄位類型
ALTER TABLE work_logs
    ALTER COLUMN user_id TYPE UUID USING uuid_generate_v4();

-- 重新建立外鍵約束
ALTER TABLE work_logs
    ADD CONSTRAINT work_logs_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;

-- 更新 work_logs 中的 user_id 以匹配新創建的用戶
WITH user_mapping AS (
    SELECT id FROM users WHERE username = '1224'
)
UPDATE work_logs
SET user_id = (SELECT id FROM user_mapping); 