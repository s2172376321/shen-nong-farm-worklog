-- 檢查用戶是否存在（使用正確的欄位）
SELECT 
    id,
    username,
    email,
    role,
    google_id,
    created_at,
    updated_at
FROM users 
WHERE username = '1224';

-- 檢查是否有任何用戶存在
SELECT COUNT(*) as total_users FROM users; 