-- 更新用戶密碼雜湊（密碼：5ji6gj94）
UPDATE users 
SET password_hash = '$2a$10$3IAfxI7ekmnHqMv1/I8.4OQxDLWHHG.tzoNWBHPmo/Gc.MwE9CvbG'
WHERE username IN ('1224', 'admin'); 