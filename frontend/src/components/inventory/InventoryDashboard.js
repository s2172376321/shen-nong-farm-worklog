// 位置：frontend/src/components/inventory/InventoryDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchInventoryItems, fetchLowStockItems, syncFromProductList } from '../../utils/inventoryApi';
import { Button, Card, Table, Input, Tag, Typography, Space } from 'antd';
import InventoryTable from './InventoryTable';
import NewItemForm from './NewItemForm';
import ScanItemModal from './ScanItemModal';
import LowStockAlert from './LowStockAlert';

const { Search } = Input;
const { Text } = Typography;

const InventoryDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [syncStatus, setSyncStatus] = useState({ loading: false, message: null });
  
  useEffect(() => {
    loadInventoryItems();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchText, inventoryItems]);

  const loadInventoryItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchInventoryItems();
      setInventoryItems(data);
      setFilteredData(data);
      
      // 獲取低庫存項目
      const lowStockData = await fetchLowStockItems();
      setLowStockItems(lowStockData);
      
      setSyncStatus({ 
        loading: false, 
        message: `同步完成! 新增: ${data.length}, 更新: ${data.length}, 跳過: 0` 
      });
      
      // 5秒後清除消息
      setTimeout(() => {
        setSyncStatus({ loading: false, message: null });
      }, 5000);
    } catch (err) {
      console.error('載入庫存數據失敗:', err);
      setError('載入庫存數據失敗，請稍後再試');
      setLoading(false);
    }
  };
  
  const filterData = () => {
    if (!Array.isArray(inventoryItems)) {
      console.warn('inventoryItems is not an array');
      setFilteredData([]);
      return;
    }
    
    const searchContent = (searchText || '').toLowerCase().trim();
    
    if (!searchContent) {
      setFilteredData(inventoryItems);
      return;
    }
    
    try {
      const filtered = inventoryItems.filter(item => {
        if (!item) return false;
        
        const searchFields = [
          item.product_id,
          item.product_name,
          item.category,
          item.unit
        ];
        
        return searchFields.some(field => 
          String(field || '').toLowerCase().includes(searchContent)
        );
      });
      
      setFilteredData(filtered);
    } catch (error) {
      console.error('Error filtering data:', error);
      setFilteredData(inventoryItems);
    }
  };
  
  const getQuantityColor = (quantity) => {
    if (quantity < 0) return 'red';
    if (quantity < 10) return 'orange';
    return 'green';
  };
  
  const columns = [
    {
      title: '商品編號',
      dataIndex: 'product_id',
      key: 'product_id',
      width: 120,
    },
    {
      title: '商品名稱',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 200,
    },
    {
      title: '類別',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category) => (
        <Tag color={
          category === '雞肉' ? 'gold' :
          category === '豬肉' ? 'pink' :
          category === '鴨肉' ? 'blue' :
          category === '雞蛋' ? 'green' :
          'default'
        }>
          {category}
        </Tag>
      ),
    },
    {
      title: '單位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: '庫存數量',
      dataIndex: 'current_quantity',
      key: 'current_quantity',
      width: 120,
      render: (quantity) => (
        <Text type={getQuantityColor(quantity)}>
          {quantity}
        </Text>
      ),
      sorter: (a, b) => a.current_quantity - b.current_quantity,
    }
  ];
  
  const summary = (pageData) => {
    const totalItems = pageData.length;
    const categories = [...new Set(pageData.map(item => item.category))];
    const categoryCount = categories.length;

    return (
      <>
        <Table.Summary.Row>
          <Table.Summary.Cell colSpan={5}>
            <Space direction="vertical">
              <Text>總商品數: {totalItems}</Text>
              <Text>商品類別數: {categoryCount}</Text>
              {categories.map(category => {
                const count = pageData.filter(item => item.category === category).length;
                return (
                  <Text key={category}>
                    {category}: {count} 項
                  </Text>
                );
              })}
            </Space>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      </>
    );
  };
  
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
              <Search
                placeholder="搜尋商品編號、名稱或類別"
                allowClear
                enterButton="搜尋"
                size="large"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ maxWidth: 400 }}
              />
            </div>
            
            {/* 管理員專用同步按鈕 */}
            {user.role === 'admin' && (
              <Button
                onClick={loadInventoryItems}
                className="ml-auto"
                disabled={syncStatus.loading}
              >
                {syncStatus.loading ? '同步中...' : '從產品列表同步'}
              </Button>
            )}
          </div>
        </Card>
        
        {/* 庫存表格 */}
        {loading ? (
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
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="product_id"
            loading={loading}
            pagination={{
              defaultPageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 項`
            }}
            summary={summary}
            scroll={{ x: 800 }}
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