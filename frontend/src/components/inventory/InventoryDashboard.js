// 位置：frontend/src/components/inventory/InventoryDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchInventoryItems, fetchLowStockItems } from '../../utils/inventoryApi';
import { Button, Card, Table, Input, Tag, Typography, Space, Popover, Spin, Alert, message } from 'antd';
import NewItemForm from './NewItemForm';
import ScanItemModal from './ScanItemModal';
import LowStockAlert from './LowStockAlert';
import { QRCodeSVG } from 'qrcode.react';

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

  // 將 filterData 移到這裡，在 useEffect 之前
  const filterData = useCallback(() => {
    if (!Array.isArray(inventoryItems)) {
      console.error('inventoryItems is not an array:', inventoryItems);
      setFilteredData([]);
      return;
    }
    
    const searchContent = (searchText || '').toLowerCase().trim();
    
    if (!searchContent) {
      setFilteredData([...inventoryItems]);
      return;
    }
    
    try {
      const filtered = inventoryItems.filter(item => {
        if (!item) return false;
        
        const searchFields = [
          item.product_id,
          item.product_name,
          item.category,
          item.unit,
          item.description
        ].filter(Boolean);
        
        return searchFields.some(field => 
          String(field).toLowerCase().includes(searchContent)
        );
      });
      
      setFilteredData(filtered);
    } catch (error) {
      console.error('Error filtering data:', error);
      message.error('搜索過程中發生錯誤');
      setFilteredData([...inventoryItems]);
    }
  }, [inventoryItems, searchText]);
  
  useEffect(() => {
    loadInventoryItems();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchText, inventoryItems, filterData]);

  const loadInventoryItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [itemsData, lowStockData] = await Promise.all([
        fetchInventoryItems(),
        fetchLowStockItems()
      ]);

      if (!Array.isArray(itemsData)) {
        throw new Error('返回的庫存數據格式不正確');
      }
      
      setInventoryItems(itemsData);
      setFilteredData(itemsData);
      
      if (Array.isArray(lowStockData)) {
        setLowStockItems(lowStockData);
      }
      
      setSyncStatus({ 
        loading: false, 
        message: `同步完成! 總項目: ${itemsData.length}` 
      });
      
      setTimeout(() => {
        setSyncStatus({ loading: false, message: null });
      }, 5000);
    } catch (err) {
      console.error('載入庫存數據失敗:', err);
      setError(err.message || '載入庫存數據失敗，請稍後再試');
      message.error('載入庫存數據失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };
  
  const getQuantityColor = (quantity) => {
    if (quantity < 0) return 'red';
    if (quantity < 10) return 'orange';
    return 'green';
  };
  
  const columns = [
    {
      title: 'QR碼',
      key: 'qr_code',
      width: 100,
      render: (_, record) => (
        <Popover 
          content={
            <div className="p-2">
              <QRCodeSVG 
                value={record.product_id}
                size={128}
                level="H"
                includeMargin={true}
              />
            </div>
          }
          title={`${record.product_name} (${record.product_id})`}
          trigger="click"
        >
          <Button type="text" size="small">
            查看QR碼
          </Button>
        </Popover>
      ),
    },
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

  if (loading) {
    return (
      <div className="inventory-dashboard">
        <Card title="庫存管理">
          <div className="flex justify-center items-center p-8">
            <Space direction="vertical" align="center">
              <Spin size="large" />
              <Text>載入庫存數據中...</Text>
            </Space>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inventory-dashboard">
        <Card title="庫存管理">
          <div className="flex flex-col items-center p-8">
            <Alert
              message="載入失敗"
              description={error}
              type="error"
              showIcon
              style={{ marginBottom: 16, width: '100%' }}
            />
            <Button type="primary" onClick={loadInventoryItems}>
              重試
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="inventory-dashboard">
      <Card title="庫存管理">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div className="flex justify-between items-center">
            <Space>
              <Button type="primary" onClick={() => navigate('/inventory/list')}>
                查看完整庫存清單
              </Button>
              {user.role === 'admin' && (
                <>
                  <Button onClick={() => setShowNewItemForm(true)}>
                    新增庫存項目
                  </Button>
                  <Button onClick={() => setShowScanner(true)}>
                    掃描 QR Code
                  </Button>
                </>
              )}
            </Space>
            <Search
              placeholder="搜索商品名稱或類別"
              onSearch={value => setSearchText(value)}
              onChange={e => setSearchText(e.target.value)}
              allowClear
              style={{ width: 300 }}
            />
          </div>

          {lowStockItems.length > 0 && (
            <LowStockAlert items={lowStockItems} />
          )}

          {syncStatus.message && (
            <Alert
              message={syncStatus.message}
              type="info"
              showIcon
              closable
              onClose={() => setSyncStatus({ loading: false, message: null })}
            />
          )}

          <Table 
            dataSource={filteredData}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 項`,
              pageSizeOptions: ['10', '20', '50', '100']
            }}
            summary={summary}
            scroll={{ x: true }}
            size="middle"
            bordered
            onChange={(pagination, filters, sorter) => {
              console.log('Table params:', { pagination, filters, sorter });
            }}
          />
        </Space>

        {showNewItemForm && (
          <NewItemForm
            visible={showNewItemForm}
            onClose={() => setShowNewItemForm(false)}
            onSuccess={handleItemCreated}
          />
        )}

        {showScanner && (
          <ScanItemModal
            visible={showScanner}
            onClose={() => setShowScanner(false)}
            onScanSuccess={handleScanSuccess}
          />
        )}
      </Card>
    </div>
  );
};

export default InventoryDashboard;