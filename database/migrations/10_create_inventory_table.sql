-- Create inventory table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_code ON inventory_items(code);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);

-- Add initial data
INSERT INTO inventory_items (name, code, quantity, unit, category, minimum_stock, description)
VALUES 
    ('Organic Fertilizer', 'FERT001', 100.00, 'kg', 'fertilizer', 20.00, 'Organic fertilizer suitable for various crops'),
    ('Insecticide', 'PEST001', 50.00, 'L', 'pesticide', 10.00, 'Organic insecticide'),
    ('Seeds', 'SEED001', 1000.00, 'pack', 'seeds', 100.00, 'Vegetable seeds')
ON CONFLICT (code) DO NOTHING; 