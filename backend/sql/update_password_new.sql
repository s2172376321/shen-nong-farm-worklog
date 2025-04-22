-- 更新用戶密碼雜湊（密碼：5ji6gj94）
UPDATE users 
SET password_hash = '$2b$10$BU.cOJszmh2/dG0x1dGKQOqCBQUU4rGPmbP2ONE5AKN2W48yTat4y'
WHERE username IN ('1224', 'admin'); 