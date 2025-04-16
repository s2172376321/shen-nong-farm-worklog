-- 07_create_inventory.sql

-- 安裝 uuid-ossp 擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 創建庫存表
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    unit VARCHAR(20) NOT NULL,
    current_quantity DECIMAL(10, 2) DEFAULT 0,
    min_quantity DECIMAL(10, 2) DEFAULT 0,
    qr_code_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);

-- 創建庫存交易記錄表
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    transaction_type VARCHAR(20) NOT NULL, -- 'in' 進貨, 'out' 領用, 'adjust' 調整
    quantity DECIMAL(10, 2) NOT NULL,
    user_id UUID REFERENCES users(id),
    requester_name VARCHAR(100), -- 非系統用戶的領用人姓名
    purpose VARCHAR(200),
    work_log_id UUID REFERENCES work_logs(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_transaction_item_id ON inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_transaction_user_id ON inventory_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transaction_date ON inventory_transactions(created_at);

-- 確保庫存量自動更新的觸發器函數
CREATE OR REPLACE FUNCTION update_inventory_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'in' THEN
        -- 進貨，增加庫存
        UPDATE inventory_items 
        SET current_quantity = current_quantity + NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.inventory_item_id;
    ELSIF NEW.transaction_type = 'out' THEN
        -- 領用，減少庫存
        UPDATE inventory_items 
        SET current_quantity = current_quantity - NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.inventory_item_id;
    ELSIF NEW.transaction_type = 'adjust' THEN
        -- 直接調整為指定數量
        UPDATE inventory_items 
        SET current_quantity = NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.inventory_item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 創建觸發器
DROP TRIGGER IF EXISTS trigger_update_inventory ON inventory_transactions;
CREATE TRIGGER trigger_update_inventory
AFTER INSERT ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION update_inventory_quantity();