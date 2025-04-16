-- 08_insert_inventory_data.sql

-- 插入庫存數據
INSERT INTO inventory_items 
(product_id, product_name, unit, current_quantity, category)
VALUES 
('28040010', '伊莎雞蛋', '顆', 18212, '雞蛋'),
('28040011', '伊莎雞蛋 10入', '盒', -2851, '雞蛋'),
('28040040', '黃金雞', '斤', 1174.8, '雞肉'),
('28040062', '豬腎', '斤', 21.8, '豬肉'),
('28041010', '半雞切塊 900g', '盒', 48, '雞肉'),
('28041020', '腿肉切塊 600g', '盒', 42, '雞肉'),
('28041021', '腿肉切塊 600g', '包', 85, '雞肉'),
('28041030', '三節翅 500g', '包', 27, '雞肉'),
('28041032', '三節翅-3kg/包', '斤', 797, '雞肉'),
('28041033', '三節翅（4支）600g', '包', 5, '雞肉'),
('28041034', '2節翅-300g', '包', -9, '雞肉'),
('28041035', '翅腿-300g', '包', 1, '雞肉'),
('28041042', '清胸肉-3kg/包', '斤', 570.8, '雞肉'),
('28041044', '雞清胸-（皮）-3kg/包', '斤', 234.2, '雞肉'),
('28041045', '清胸肉（去皮）280g', '包', 53, '雞肉'),
('28041046', '雞清胸絞肉', '斤', 6.5, '雞肉'),
('28041050', '里肌', '盒', 1, '豬肉'),
('28041053', '里肌, 220-230g', '包', 28, '豬肉'),
('28041060', '雞佛', '斤', 6, '雞肉'),
('28041070', '雞心', '斤', 60.7, '雞肉'),
('28041080', '雞腿', '斤', 4, '雞肉'),
('28041090', '雞頭腿', '斤', 577.6, '雞肉'),
('28041091', '雞頭腿去皮-3kg/包', '斤', 273.1, '雞肉'),
('28041092', '雞腿皮-3kg/包', '斤', 133.3, '雞肉'),
('28041100', '雞骨(頸)', '斤', 1652, '雞肉'),
('28041120', '雞尾椎', '斤', 35.5, '雞肉'),
('28041130', '雞腳趾', '斤', 95.7, '雞肉'),
('28041140', '鴨腎', '斤', 180.2, '鴨肉'),
('28041160', '清胸肉(帶皮)-3kg/包', '斤', 5, '雞肉'),
('28041170', '里肌-3kg/包', '斤', 245.9, '豬肉'),
('28041190', '腿肉(帶皮去骨)-3kg/包', '斤', 441.7, '雞肉'),
('28041191', '腿肉(帶皮帶骨-去骨)-3kg/包', '斤', 1912.9, '雞肉'),
('28041200', '二節翅-3kg/包', '斤', 54.4, '雞肉'),
('28041210', '翅腿-3kg/包', '斤', -2.7, '雞肉'),
('28041231', '腿肉-(高麗菜)水餃-100顆/包', '包', 49, '水餃'),
('28041240', '鴨心', '斤', 42.4, '鴨肉'),
('28041260', '雞肝', '斤', 193.3, '雞肉'),
('28042050', '鴨肝', '斤', 74.2, '鴨肉'),
('28042110', '豬肝', '斤', 13.2, '豬肉'),
('28042120', '雞肉切塊3kg/包', '斤', 31.4, '雞肉'),
('28042130', '雞腿(骨)', '斤', 88.9, '雞肉'),
('28042150', '馬告檸檬椒鹽醃肝雞腿(100g)/片', '包', 251, '雞肉'),
('28042160', '馬告檸檬椒鹽醃肝雞腿(100g)', '包', 41, '雞肉'),
('28042170', '鴨肉塊', '斤', 15, '鴨肉')
ON CONFLICT (product_id) DO UPDATE 
SET 
    product_name = EXCLUDED.product_name,
    unit = EXCLUDED.unit,
    current_quantity = EXCLUDED.current_quantity,
    category = EXCLUDED.category,
    updated_at = CURRENT_TIMESTAMP; 