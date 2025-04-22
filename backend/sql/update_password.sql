-- 更新用戶密碼雜湊（密碼：5ji6gj94）
UPDATE users 
SET password_hash = '$2a$10$YYQaZVdfrBUVlU/3BKGKbOPOYlZEXS1fn8UZu8rQU1K1HQKvDPKVi'
WHERE username IN ('1224', 'admin'); 