-- 插入測試用戶
INSERT INTO users (username, password, email, role)
VALUES (
  '1224',  -- 用戶名
  '$2b$10$YourHashedPasswordHere',  -- 請替換為實際的加密密碼
  'test@example.com',  -- 郵箱
  'user'  -- 角色
); 