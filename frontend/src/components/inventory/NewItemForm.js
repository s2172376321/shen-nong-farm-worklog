// 位置：frontend/src/components/inventory/NewItemForm.js
import React, { useState, useEffect } from 'react';
import { createInventoryItem, fetchInventoryItemByProductId } from '../../utils/inventoryApi';
import { fetchProducts } from '../../utils/api';
import { Modal, Form, Input, InputNumber, Select, Button, message } from 'antd';

const NewItemForm = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
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
        message.error('載入產品數據失敗');
      } finally {
        setIsLoadingProducts(false);
      }
    };
    
    if (visible) {
      loadProducts();
    }
  }, [visible]);

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
  const handleNumberChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 選擇產品建議
  const handleSelectSuggestion = async (product) => {
    setShowSuggestions(false);
    
    try {
      const existingItem = await fetchInventoryItemByProductId(product.商品編號);
      
      if (existingItem) {
        message.error(`產品ID "${product.商品編號}" 已存在於庫存中`);
        return;
      }
      
      const newData = {
        product_id: product.商品編號 || '',
        product_name: product.規格 || product.商品編號 || '',
        category: getCategoryFromProductId(product.商品編號),
        description: '',
        unit: product.單位 || '個',
        current_quantity: 0,
        min_quantity: isMaterialOrFeedType(product.商品編號) ? 10 : 0
      };
      
      setFormData(newData);
      form.setFieldsValue(newData);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        const newData = {
          product_id: product.商品編號 || '',
          product_name: product.規格 || product.商品編號 || '',
          category: getCategoryFromProductId(product.商品編號),
          description: '',
          unit: product.單位 || '個',
          current_quantity: 0,
          min_quantity: isMaterialOrFeedType(product.商品編號) ? 10 : 0
        };
        
        setFormData(newData);
        form.setFieldsValue(newData);
      } else {
        console.error('檢查產品ID時發生錯誤:', err);
        message.error('檢查產品ID時發生錯誤');
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
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const values = await form.validateFields();
      
      // 檢查該產品ID是否已經存在於庫存中
      try {
        const existingItem = await fetchInventoryItemByProductId(values.product_id);
        
        if (existingItem) {
          throw new Error(`產品ID "${values.product_id}" 已存在於庫存中`);
        }
      } catch (err) {
        if (!err.response || err.response.status !== 404) {
          throw err;
        }
      }
      
      // 提交新項目
      await createInventoryItem(values);
      
      message.success('庫存項目創建成功！');
      form.resetFields();
      onSuccess && onSuccess();
      onClose && onClose();
    } catch (err) {
      console.error('創建庫存項目失敗:', err);
      message.error(err.message || '創建庫存項目失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title="新增庫存項目"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isLoading}
          onClick={handleSubmit}
        >
          確定
        </Button>
      ]}
      width={720}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={formData}
      >
        <Form.Item
          name="product_id"
          label="產品編號"
          rules={[{ required: true, message: '請輸入產品編號' }]}
        >
          <Input
            placeholder="請輸入產品編號"
            onChange={(e) => handleChange(e)}
            autoComplete="off"
          />
        </Form.Item>
        
        {showSuggestions && (
          <div className="mb-4 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {productSuggestions.map(product => (
              <div
                key={product.商品編號}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelectSuggestion(product)}
              >
                {product.商品編號} - {product.規格}
              </div>
            ))}
          </div>
        )}

        <Form.Item
          name="product_name"
          label="產品名稱"
          rules={[{ required: true, message: '請輸入產品名稱' }]}
        >
          <Input placeholder="請輸入產品名稱" />
        </Form.Item>

        <Form.Item
          name="category"
          label="類別"
          rules={[{ required: true, message: '請選擇類別' }]}
        >
          <Select placeholder="請選擇類別">
            <Select.Option value="葉菜類">葉菜類</Select.Option>
            <Select.Option value="水果類">水果類</Select.Option>
            <Select.Option value="瓜果類">瓜果類</Select.Option>
            <Select.Option value="家禽類">家禽類</Select.Option>
            <Select.Option value="魚類">魚類</Select.Option>
            <Select.Option value="加工品類">加工品類</Select.Option>
            <Select.Option value="葉菜種子種苗">葉菜種子種苗</Select.Option>
            <Select.Option value="水果種子種苗">水果種子種苗</Select.Option>
            <Select.Option value="肥料">肥料</Select.Option>
            <Select.Option value="資材">資材</Select.Option>
            <Select.Option value="飼料">飼料</Select.Option>
            <Select.Option value="其他">其他</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="unit"
          label="單位"
          rules={[{ required: true, message: '請輸入單位' }]}
        >
          <Input placeholder="請輸入單位" />
        </Form.Item>

        <Form.Item
          name="current_quantity"
          label="當前數量"
          rules={[{ required: true, message: '請輸入當前數量' }]}
        >
          <InputNumber
            min={0}
            placeholder="請輸入當前數量"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="min_quantity"
          label="最小庫存量"
          rules={[{ required: true, message: '請輸入最小庫存量' }]}
        >
          <InputNumber
            min={0}
            placeholder="請輸入最小庫存量"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述"
        >
          <Input.TextArea
            rows={4}
            placeholder="請輸入描述（選填）"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default NewItemForm;