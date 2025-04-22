-- 檢查用戶表的完整內容
SELECT 
    id,
    username,
    email,
    role,
    is_active,
    substring(password_hash, 1, 30) as password_hash_prefix,
    created_at,
    updated_at
FROM users; 