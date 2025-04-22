-- 創建庫存領用記錄表
CREATE TABLE IF NOT EXISTS inventory_checkouts (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER NOT NULL REFERENCES inventory_items(id),
    product_id VARCHAR(50) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    user_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    purpose TEXT NOT NULL,
    checkout_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 添加約束
    CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- 創建索引
CREATE INDEX idx_inventory_checkouts_inventory_id ON inventory_checkouts(inventory_id);
CREATE INDEX idx_inventory_checkouts_user_id ON inventory_checkouts(user_id);
CREATE INDEX idx_inventory_checkouts_checkout_date ON inventory_checkouts(checkout_date);

-- 創建觸發器函數，用於更新庫存數量
CREATE OR REPLACE FUNCTION update_inventory_quantity_after_checkout()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新庫存數量
    UPDATE inventory_items
    SET current_quantity = current_quantity - NEW.quantity
    WHERE id = NEW.inventory_id;
    
    -- 檢查是否低於最小庫存量
    INSERT INTO inventory_alerts (inventory_id, alert_type, message)
    SELECT 
        NEW.inventory_id,
        'low_stock'::alert_type,
        '庫存量低於最小庫存量'
    FROM inventory_items
    WHERE id = NEW.inventory_id
    AND current_quantity <= min_quantity
    AND NOT EXISTS (
        SELECT 1 FROM inventory_alerts
        WHERE inventory_id = NEW.inventory_id
        AND alert_type = 'low_stock'
        AND created_at > NOW() - INTERVAL '24 hours'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 創建觸發器
CREATE TRIGGER tr_update_inventory_after_checkout
AFTER INSERT ON inventory_checkouts
FOR EACH ROW
EXECUTE FUNCTION update_inventory_quantity_after_checkout();

-- 創建庫存項目表
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'piece',
    location VARCHAR(255) NOT NULL DEFAULT 'default_warehouse',
    category VARCHAR(100) NOT NULL DEFAULT 'other',
    minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 