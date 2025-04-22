// 位置：frontend/src/components/inventory/QuantityAdjustModal.js
import React, { useState } from 'react';
import { adjustInventoryQuantity } from '../../utils/inventoryApi';
import { Button, Input } from '../ui';

const QuantityAdjustModal = ({ item, onClose, onComplete }) => {
  const [formData, setFormData] = useState({
    transaction_type: 'in', // 'in', 'out', 'adjust'
    quantity: '',
    requester_name: '',
    purpose: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRequester, setShowRequester] = useState(false);

  // 變更表單欄位
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 當選擇出庫時，顯示領用人欄位
    if (name === 'transaction_type' && value === 'out') {
      setShowRequester(true);
    } else if (name === 'transaction_type' && value !== 'out') {
      setShowRequester(false);
    }
  };

  // 提交表單
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 轉換數量為數字
      const adjustmentData = {
        ...formData,
        quantity: parseFloat(formData.quantity)
      };

      console.log('提交的數據:', adjustmentData);
      
      // 驗證數量
      if (isNaN(adjustmentData.quantity) || adjustmentData.quantity <= 0) {
        throw new Error('數量必須是大於0的數字');
      }
      
      // 驗證出庫時的領用人
      if (adjustmentData.transaction_type === 'out' && !adjustmentData.requester_name.trim()) {
        throw new Error('出庫時必須填寫領用人姓名');
      }
      
      // 驗證出庫時的用途
      if (adjustmentData.transaction_type === 'out' && !adjustmentData.purpose.trim()) {
        throw new Error('出庫時必須填寫用途');
      }
      
      // 檢查出庫數量是否超過庫存
      if (adjustmentData.transaction_type === 'out' && adjustmentData.quantity > parseFloat(item.current_quantity)) {
        throw new Error(`庫存不足，目前庫存: ${item.current_quantity} ${item.unit}`);
      }

      // 確保所有必要字段都存在
      const payload = {
        transaction_type: adjustmentData.transaction_type,
        quantity: adjustmentData.quantity,
        requester_name: adjustmentData.requester_name || null,
        purpose: adjustmentData.purpose || null,
        notes: adjustmentData.notes || null
      };
      
      console.log('發送到後端的數據:', payload);
      
      // 呼叫 API
      const response = await adjustInventoryQuantity(item.id, payload);
      console.log('API 響應:', response);
      
      // 成功後關閉彈窗並通知父組件
      onComplete && onComplete();
    } catch (err) {
      console.error('調整庫存數量失敗:', err);
      setError(err.message || '調整庫存數量失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">調整庫存數量</h2>
          <Button 
            onClick={onClose}
            variant="secondary"
            className="py-1 px-2"
          >
            關閉
          </Button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-300">產品: {item.product_name}</p>
          <p className="text-gray-300">現有庫存: {item.current_quantity} {item.unit}</p>
        </div>
        
        {error && (
          <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 交易類型選擇 */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              交易類型
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className={`flex items-center justify-center p-2 rounded-lg cursor-pointer ${
                formData.transaction_type === 'in' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-300'
              }`}>
                <input
                  type="radio"
                  name="transaction_type"
                  value="in"
                  checked={formData.transaction_type === 'in'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span>進貨</span>
              </label>
              <label className={`flex items-center justify-center p-2 rounded-lg cursor-pointer ${
                formData.transaction_type === 'out' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-700 text-gray-300'
              }`}>
                <input
                  type="radio"
                  name="transaction_type"
                  value="out"
                  checked={formData.transaction_type === 'out'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span>出庫</span>
              </label>
              <label className={`flex items-center justify-center p-2 rounded-lg cursor-pointer ${
                formData.transaction_type === 'adjust' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-gray-700 text-gray-300'
              }`}>
                <input
                  type="radio"
                  name="transaction_type"
                  value="adjust"
                  checked={formData.transaction_type === 'adjust'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span>直接調整</span>
              </label>
            </div>
          </div>
          
          {/* 數量 */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              {formData.transaction_type === 'adjust' ? '設定數量' : '數量'} ({item.unit})
            </label>
            <Input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
              placeholder={`請輸入${formData.transaction_type === 'adjust' ? '設定' : ''}數量`}
            />
            {formData.transaction_type === 'adjust' && (
              <p className="text-xs text-gray-400 mt-1">
                直接調整會將庫存設為指定數量，而非增減
              </p>
            )}
          </div>
          
          {/* 領用人 (僅出庫時顯示) */}
          {showRequester && (
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-300">
                領用人姓名 <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="requester_name"
                value={formData.requester_name}
                onChange={handleChange}
                required={formData.transaction_type === 'out'}
                placeholder="請輸入領用人姓名"
              />
            </div>
          )}
          
          {/* 用途 (僅出庫時為必填) */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              用途 {formData.transaction_type === 'out' && <span className="text-red-500">*</span>}
            </label>
            <Input
              type="text"
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              required={formData.transaction_type === 'out'}
              placeholder="請輸入用途"
            />
          </div>
          
          {/* 備註 */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              備註
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              rows="2"
              placeholder="選填"
            />
          </div>
          
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="mr-2"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={
                formData.transaction_type === 'in' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : formData.transaction_type === 'out'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
              }
            >
              {isLoading ? '處理中...' : '確認'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuantityAdjustModal;