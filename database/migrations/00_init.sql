-- 00_init.sql
DO $$
BEGIN
    -- 安全地創建擴展
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        CREATE EXTENSION "uuid-ossp";
    END IF;

    -- 安全地創建列舉型別
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'admin', 'manager');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_category') THEN
        CREATE TYPE work_category AS ENUM (
          '前置整理', '基肥翻土', '灌溉', '防蟲', 
          '施肥', '除草', '整枝', '種植', 
          '食農教育', '環境整潔', '擦雞蛋', 
          '撿雞蛋', '出貨準備', '伙食準備', 
          '採收', '加工領料', '加工入庫', 
          '屠宰', '屠宰前置作業'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_log_status') THEN
        CREATE TYPE work_log_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in 00_init.sql: %', SQLERRM;
END $$;