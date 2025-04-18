-- 創建臨時表來存放CSV數據
CREATE TEMP TABLE temp_inventory (
    product_id VARCHAR(50),
    product_name VARCHAR(200),
    unit VARCHAR(20),
    current_quantity DECIMAL(10, 2)
);

-- 將CSV數據導入臨時表
COPY temp_inventory FROM 'C:\Users\force\Documents\harvest\shen-nong-farm-worklog\data\庫存表.csv' WITH (
    FORMAT csv,
    HEADER true,
    ENCODING 'UTF8'
);

-- 更新現有庫存項目的數量
UPDATE inventory_items i
SET 
    current_quantity = t.current_quantity,
    updated_at = CURRENT_TIMESTAMP
FROM temp_inventory t
WHERE i.product_id = t.product_id;

-- 插入新的庫存項目
INSERT INTO inventory_items (
    product_id,
    product_name,
    unit,
    current_quantity,
    category,
    min_quantity
)
SELECT 
    t.product_id,
    t.product_name,
    t.unit,
    t.current_quantity,
    CASE 
        WHEN t.product_id LIKE '2804%' THEN '肉品'
        ELSE '其他'
    END as category,
    0 as min_quantity
FROM temp_inventory t
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_items i WHERE i.product_id = t.product_id
);

-- 為每個新增的項目添加一筆初始庫存交易記錄
INSERT INTO inventory_transactions (
    inventory_item_id,
    transaction_type,
    quantity,
    purpose,
    notes
)
SELECT 
    i.id,
    'adjust',
    i.current_quantity,
    '初始庫存設定',
    'CSV檔案匯入'
FROM inventory_items i
WHERE i.id IN (
    SELECT i2.id 
    FROM inventory_items i2
    JOIN temp_inventory t ON t.product_id = i2.product_id
    WHERE NOT EXISTS (
        SELECT 1 FROM inventory_transactions tr WHERE tr.inventory_item_id = i2.id
    )
);

-- 刪除臨時表
DROP TABLE temp_inventory; 