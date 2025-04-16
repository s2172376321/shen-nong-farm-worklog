// 位置：frontend/src/components/inventory/NewItemForm.js
import React, { useState, useEffect } from 'react';
import { createInventoryItem, fetchInventoryItemByProductId } from '../../utils/inventoryApi';
import { fetchProducts } from '../../utils/api';
import { Button, Input } from '../ui';

const NewItemForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    product_id: '',
    product_name: '',
    category: '',
    description: '',
    unit: '',
    current_quantity: 0,
    min_quantity: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // 載入產品數據
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true);
        const data = await fetchProducts();
        if (Array.isArray(data)) {
          setAllProducts(data);
        }
      } catch (err) {
        console.error('載入產品數據失敗:', err);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    
    loadProducts();
  }, []);

  // 處理表單變更
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 如果修改的是產品ID欄位，嘗試搜尋建議
    if (name === 'product_id' && value.length >= 2) {
      const suggestions = allProducts
        .filter(p => {
          const productId = (p.商品編號 || '').toString().toLowerCase();
          const productName = (p.規格 || '').toString().toLowerCase();
          const searchTerm = value.toLowerCase();
          
          return productId.includes(searchTerm) || productName.includes(searchTerm);
        })
        .slice(0, 10); // 限制顯示10個建議
        
      setProductSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else if (name === 'product_id' && value.length < 2) {
      setShowSuggestions(false);
    }
  };

  // 處理數值變更
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : Number(value);
    
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));
  };

  // 選擇產品建議
  const handleSelectSuggestion = async (product) => {
    setShowSuggestions(false);
    
    // 檢查該產品ID是否已經存在於庫存中
    try {
      const existingItem = await fetchInventoryItemByProductId(product.商品編號);
      
      if (existingItem) {
        setError(`產品ID "${product.商品編號}" 已存在於庫存中`);
        return;
      }
      
      // 設置表單資料
      setFormData({
        product_id: product.商品編號 || '',
        product_name: product.規格 || product.商品編號 || '',
        category: getCategoryFromProductId(product.商品編號),
        description: '',
        unit: product.單位 || '個',
        current_quantity: 0,
        min_quantity: isMaterialOrFeedType(product.商品編號) ? 10 : 0
      });
    } catch (err) {
      console.error('檢查產品ID時發生錯誤:', err);
      // 如果是404錯誤，表示產品ID不存在於庫存中，可以繼續
      if (err.response && err.response.status === 404) {
        setFormData({
          product_id: product.商品編號 || '',
          product_name: product.規格 || product.商品編號 || '',
          category: getCategoryFromProductId(product.商品編號),
          description: '',
          unit: product.單位 || '個',
          current_quantity: 0,
          min_quantity: isMaterialOrFeedType(product.商品編號) ? 10 : 0
        });
      }
    }
  };

  // 判斷是否為資材、肥料或飼料類型
  const isMaterialOrFeedType = (productId) => {
    if (!productId) return false;
    return productId.startsWith('2809') || productId.startsWith('2810') || productId.startsWith('2811');
  };
  
  // 根據產品ID獲取類別
  const getCategoryFromProductId = (productId) => {
    if (!productId) return '其他';
    
    const categoryMap = {
      '2801': '葉菜類',
      '2802': '水果類',
      '2803': '瓜果類',
      '2804': '家禽類',
      '2805': '魚類',
      '2806': '加工品類',
      '2807': '葉菜種子種苗',
      '2808': '水果種子種苗',
      '2809': '肥料',
      '2810': '資材',
      '2811': '飼料',
    };
    
    // 嘗試匹配前四位數字
    const prefix = productId.substring(0, 4);
    return categoryMap[prefix] || '其他';
  };

  // 提交表單
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 驗證必填欄位
      if (!formData.product_id.trim()) {
        throw new Error('產品編號不能為空');
      }
      
      if (!formData.product_name.trim()) {
        throw new Error('產品名稱不能為空');
      }
      
      if (!formData.unit.trim()) {
        throw new Error('單位不能為空');
      }
      
      // 檢查該產品ID是否已經存在於庫存中
      try {
        const existingItem = await fetchInventoryItemByProductId(formData.product_id);
        
        if (existingItem) {
          throw new Error(`產品ID "${formData.product_id}" 已存在於庫存中`);
        }
      } catch (err) {
        // 如果是404錯誤，表示產品ID不存在於庫存中，可以繼續
        if (!err.response || err.response.status !== 404) {
          throw err;
        }
      }
      
      // 提交新項目
      await createInventoryItem(formData);
      
      // 成功後重置表單
      setFormData({
        product_id: '',
        product_name: '',
        category: '',
        description: '',
        unit: '',
        current_quantity: 0,
        min_quantity: 0
      });
      
      setSuccess(true);
      
      // 3秒後關閉成功訊息
      setTimeout(() => {
        setSuccess(false);
        onSuccess && onSuccess();
      }, 2000);
    } catch (err) {
      console.error('創建庫存項目失敗:', err);
      setError(err.message || '創建庫存項目失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-600 text-white p-3 rounded-lg mb-4">
          庫存項目創建成功!
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 產品ID */}
          <div className="relative">
            <label className="block mb-2 text-sm font-medium text-gray-300">
              產品編號 <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
              required
              placeholder="請輸入產品編號"
              autoComplete="off"
            />
            {showSuggestions && (
              <div className="absolute z-10 mt-1 w-full bg-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {productSuggestions.map(product => (
                  <div 
                    key={product.商品編號}
                    className="p-2 hover:bg-gray-600 cursor-pointer"
                    onClick={() => handleSelectSuggestion(product)}
                  >
                    <div className="font-medium">{product.商品編號}</div>
                    <div className="text-sm text-gray-400">{product.規格} ({product.單位 || '單位不明'})</div>
                  </div>
                ))}
                {isLoadingProducts && (
                  <div className="p-2 text-center text-gray-400">
                    載入中...
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">
              提示: 輸入產品編號可以自動填入相關資訊
            </p>
          </div>
          
          {/* 產品名稱 */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              產品名稱 <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              name="product_name"
              value={formData.product_name}
              onChange={handleChange}
              required
              placeholder="請輸入產品名稱"
            />
          </div>
          
          {/* 類別 */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              類別
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="">選擇類別</option>
              <option value="葉菜類">葉菜類</option>
              <option value="水果類">水果類</option>
              <option value="瓜果類">瓜果類</option>
              <option value="家禽類">家禽類</option>
              <option value="魚類">魚類</option>
              <option value="加工品類">加工品類</option>
              <option value="葉菜種子種苗">葉菜種子種苗</option>
              <option value="水果種子種苗">水果種子種苗</option>
              <option value="肥料">肥料</option>
              <option value="資材">資材</option>
              <option value="飼料">飼料</option>
              <option value="其他">其他</option>
            </select>
          </div>
          
          {/* 單位 */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              單位 <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              required
              placeholder="例如：個、斤、包、公斤等"
            />
          </div>
          
          {/* 初始庫存 */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              初始庫存
            </label>
            <Input
              type="number"
              name="current_quantity"
              value={formData.current_quantity}
              onChange={handleNumberChange}
              min="0"
              step="0.01"
              placeholder="0"
            />
          </div>
          
          {/* 最低庫存量 */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              最低庫存量
            </label>
            <Input
              type="number"
              name="min_quantity"
              value={formData.min_quantity}
              onChange={handleNumberChange}
              min="0"
              step="0.01"
              placeholder="0"
            />
            <p className="text-xs text-gray-400 mt-1">
              當庫存低於此值時會顯示警告
            </p>
          </div>
        </div>
        
        {/* 描述 */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">
            描述
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            rows="3"
            placeholder="選填"
          />
        </div>
        
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '處理中...' : '建立庫存項目'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewItemForm;