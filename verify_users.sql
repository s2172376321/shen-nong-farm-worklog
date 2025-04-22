-- 驗證表結構
\d users;

-- 驗證用戶創建
SELECT 
    id,
    username,
    email,
    role,
    is_active,
    created_at
FROM users 
ORDER BY created_at; 