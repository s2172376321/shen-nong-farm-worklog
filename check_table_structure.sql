-- 檢查用戶表的實際結構
\d users;

-- 使用不包含 last_login 的基本查詢
SELECT 
    username,
    email,
    role,
    created_at
FROM users 
WHERE username = '1224'; 