-- 驗證用戶是否創建成功
SELECT 
    id,
    username,
    email,
    role,
    created_at
FROM users 
WHERE username = '1224'; 