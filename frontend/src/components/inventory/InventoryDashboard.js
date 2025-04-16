// 位置：frontend/src/components/inventory/InventoryDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchInventoryItems, fetchLowStockItems, syncFromProductList } from '../../utils/inventoryApi';
import { Button, Card } from '../ui';
import InventoryTable from './InventoryTable';
import NewItemForm from './NewItemForm';
import ScanItemModal from './ScanItemModal';
import LowStockAlert from './LowStockAlert';

const InventoryDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [syncStatus, setSyncStatus] = useState({ loading: false, message: null });
  
  // 獲取庫存項目
  const loadInventoryItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await fetchInventoryItems();
      setInventoryItems(data);
      
      // 獲取低庫存項目
      const lowStockData = await fetchLowStockItems();
      setLowStockItems(lowStockData);
      
      setIsLoading(false);
    } catch (err) {
      console.error('載入庫存數據失敗:', err);
      setError('載入庫存數據失敗，請稍後再試');
      setIsLoading(false);
    }
  };
  
  // 初始加載
  useEffect(() => {
    loadInventoryItems();
  }, []);
  
  // 從產品列表同步
  const handleSyncFromProducts = async () => {
    try {
      setSyncStatus({ loading: true, message: '正在同步產品數據...' });
      
      const result = await syncFromProductList();
      
      setSyncStatus({ 
        loading: false, 
        message: `同步完成! 新增: ${result.created}, 更新: ${result.updated}, 跳過: ${result.skipped}` 
      });
      
      // 重新加載數據
      await loadInventoryItems();
      
      // 5秒後清除消息
      setTimeout(() => {
        setSyncStatus({ loading: false, message: null });
      }, 5000);
    } catch (err) {
      console.error('同步產品數據失敗:', err);
      setSyncStatus({ loading: false, message: '同步失敗: ' + (err.message || '未知錯誤') });
    }
  };
  
  // 過濾項目
  const getFilteredItems = () => {
    return inventoryItems.filter(item => {
      // 類別過濾
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      
      // 搜尋過濾
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          item.product_id.toLowerCase().includes(term) ||
          item.product_name.toLowerCase().includes(term) ||
          item.category.toLowerCase().includes(term)
        );
      }
      
      return true;
    });
  };
  
  // 獲得所有唯一類別
  const categories = ['all', ...new Set(inventoryItems.map(item => item.category))];
  
  // 處理項目創建成功
  const handleItemCreated = async () => {
    setShowNewItemForm(false);
    await loadInventoryItems();
  };
  
  // 處理掃描成功
  const handleScanSuccess = (itemId) => {
    setShowScanner(false);
    navigate(`/inventory/${itemId}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">庫存管理</h1>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setShowScanner(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              掃描QR碼
            </Button>
            {user.role === 'admin' && (
              <Button 
                onClick={() => setShowNewItemForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                新增庫存項目
              </Button>
            )}
          </div>
        </div>
        
        {/* 低庫存提醒 */}
        {lowStockItems.length > 0 && (
          <LowStockAlert items={lowStockItems} className="mb-6" />
        )}
        
        {/* 同步狀態 */}
        {syncStatus.message && (
          <div className={`mb-4 p-3 rounded-lg bg-${syncStatus.loading ? 'yellow' : 'green'}-700`}>
            <p className="font-medium">{syncStatus.message}</p>
          </div>
        )}
        
        <Card className="mb-6 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* 搜索框 */}
            <div className="w-full md:w-auto flex-grow">
              <input
                type="text"
                placeholder="搜尋產品 ID 或名稱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
              />
            </div>
            
            {/* 類別過濾 */}
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    activeCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {category === 'all' ? '全部類別' : category}
                </button>
              ))}
            </div>
            
            {/* 管理員專用同步按鈕 */}
            {user.role === 'admin' && (
              <Button
                onClick={handleSyncFromProducts}
                className="ml-auto"
                disabled={syncStatus.loading}
              >
                {syncStatus.loading ? '同步中...' : '從產品列表同步'}
              </Button>
            )}
          </div>
        </Card>
        
        {/* 庫存表格 */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-600 text-white p-4 rounded-lg">
            <p>{error}</p>
            <Button onClick={loadInventoryItems} className="mt-4">
              重試
            </Button>
          </div>
        ) : (
          <InventoryTable 
            items={getFilteredItems()} 
            onItemUpdated={loadInventoryItems} 
          />
        )}
      </div>
      
      {/* 新增項目表單彈窗 */}
      {showNewItemForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">新增庫存項目</h2>
              <Button 
                onClick={() => setShowNewItemForm(false)}
                variant="secondary"
                className="py-1 px-2"
              >
                關閉
              </Button>
            </div>
            <NewItemForm onSuccess={handleItemCreated} />
          </div>
        </div>
      )}
      
      {/* 掃描 QR 碼彈窗 */}
      {showScanner && (
        <ScanItemModal 
          onClose={() => setShowScanner(false)} 
          onScanSuccess={handleScanSuccess}
        />
      )}
    </div>
  );
};

export default InventoryDashboard;