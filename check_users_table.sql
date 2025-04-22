-- 檢查用戶表結構
\d users;

-- 檢查用戶總數
SELECT COUNT(*) as total_users FROM users;

-- 列出所有用戶（限制10個）
SELECT 
    username,
    email,
    role,
    created_at,
    last_login
FROM users 
LIMIT 10; 