-- 檢查並修復 inventory_items 表的列名
DO $$
BEGIN
    -- 檢查 quantity 列是否存在
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'inventory_items'
        AND column_name = 'quantity'
    ) THEN
        -- 如果 quantity 列存在且 current_quantity 不存在，則重命名
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'inventory_items'
            AND column_name = 'current_quantity'
        ) THEN
            ALTER TABLE inventory_items
            RENAME COLUMN quantity TO current_quantity;
        END IF;
    ELSE
        -- 如果 current_quantity 列不存在，則新增
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'inventory_items'
            AND column_name = 'current_quantity'
        ) THEN
            ALTER TABLE inventory_items
            ADD COLUMN current_quantity DECIMAL(10,2) NOT NULL DEFAULT 0;
        END IF;
    END IF;
END $$; 