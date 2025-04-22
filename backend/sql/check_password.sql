-- 檢查密碼雜湊
SELECT 
    username,
    password_hash,
    LENGTH(password_hash) as hash_length
FROM users 
WHERE username = '1224'; 