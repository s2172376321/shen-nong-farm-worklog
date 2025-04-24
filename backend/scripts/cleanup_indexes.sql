-- 清理重複的索引
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE tablename = 'users'
        AND indexname LIKE 'users_%_key%'
        AND indexname != 'users_pkey'
    ) LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.indexname);
    END LOOP;
END $$;

-- 重新創建必要的索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role); 