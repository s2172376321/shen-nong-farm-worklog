-- 位置：database/migrations/05_reset_admin_password.sql

-- 重置管理员密码
UPDATE users 
SET password_hash = '$2a$10$jHkUV0nF8EPxqGl/KnFo0OzX4kULitoAfXQq9Uv3PNcJmjKYNJCIu' 
WHERE email = 'admin@shennong.farm';