-- 創建測試用戶（密碼：5ji6gj94）
INSERT INTO users (
    username,
    email,
    password_hash,
    role,
    created_at,
    updated_at
) VALUES (
    '1224',
    'test@example.com',
    '$2b$10$3IAfxI7ekmnHqMv1/I8.4OQxDLWHHG.tzoNWBHPmo/Gc.MwE9CvbG',  -- 加密後的密碼：5ji6gj94
    'user',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) RETURNING id, username, email, role, created_at; 