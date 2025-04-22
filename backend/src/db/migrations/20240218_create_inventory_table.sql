-- 創建庫存表
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT '個',
    location VARCHAR(255) NOT NULL DEFAULT '預設倉庫',
    category VARCHAR(100) NOT NULL DEFAULT '其他',
    minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_inventory_code ON inventory_items(code);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);

-- 添加一些初始數據
INSERT INTO inventory_items (name, code, quantity, unit, category, minimum_stock, description)
VALUES 
    ('有機肥料', 'FERT001', 100.00, '公斤', '肥料', 20.00, '有機肥料，適合各種作物'),
    ('殺蟲劑', 'PEST001', 50.00, '公升', '農藥', 10.00, '有機殺蟲劑'),
    ('種子', 'SEED001', 1000.00, '包', '種子', 100.00, '蔬菜種子')
ON CONFLICT (code) DO NOTHING; 