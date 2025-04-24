-- 檢查用戶表結構
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'users';

-- 檢查用戶資料
SELECT 
    id,
    username,
    email,
    role,
    is_active,
    last_login,
    created_at,
    updated_at
FROM 
    users
ORDER BY 
    created_at DESC; 