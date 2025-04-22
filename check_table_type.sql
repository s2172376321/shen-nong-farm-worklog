-- 檢查表的 id 類型
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'id';

-- 檢查 user_role 類型是否存在
SELECT typname, typtype
FROM pg_type
WHERE typname = 'user_role'; 