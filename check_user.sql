-- 檢查用戶是否存在
SELECT 
    username,
    email,
    role,
    created_at,
    last_login
FROM users 
WHERE username = '1224'; 