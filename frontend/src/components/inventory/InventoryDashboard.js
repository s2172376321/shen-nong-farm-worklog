// 位置：frontend/src/components/inventory/InventoryDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchInventoryItems, fetchLowStockItems, fetchInventoryStats, deleteInventoryItem } from '../../utils/inventoryApi';
import { Button, Card, Table, Input, Tag, Typography, Space, Popover, Spin, Alert, message, Statistic, Row, Col, Modal } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, HomeOutlined } from '@ant-design/icons';
import NewItemForm from './NewItemForm';
import ScanItemModal from './ScanItemModal';
import LowStockAlert from './LowStockAlert';
import { QRCodeSVG } from 'qrcode.react';

const { Search } = Input;
const { Text } = Typography;

const InventoryDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [stats, setStats] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ loading: false, message: null });

  // 過濾數據
  const getFilteredData = () => {
    if (!Array.isArray(inventoryItems)) {
      console.error('inventoryItems is not an array:', inventoryItems);
      return [];
    }
    
    const searchLower = searchText.toLowerCase();
    return inventoryItems.filter(item => {
      if (!item) return false;
      
      const nameMatch = (item.product_name || '').toLowerCase().includes(searchLower);
      const codeMatch = (item.product_id || '').toLowerCase().includes(searchLower);
      
      return nameMatch || codeMatch;
    });
  };

  // 使用過濾後的數據
  const displayData = getFilteredData();
  
  useEffect(() => {
    loadInventoryItems();
  }, []);

  useEffect(() => {
    // 當 searchText 或 inventoryItems 改變時，displayData 會自動更新
  }, [searchText, inventoryItems]);

  const loadInventoryItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [itemsData, lowStockData] = await Promise.all([
        fetchInventoryItems(),
        fetchLowStockItems()
      ]);

      console.log('API返回的原始數據:', { itemsData, lowStockData });
      console.log('低庫存數據:', lowStockData);

      if (!Array.isArray(itemsData)) {
        console.error('數據格式不正確:', itemsData);
        throw new Error('返回的庫存數據格式不正確');
      }
      
      // 處理數據格式
      const processedItems = itemsData.map(item => ({
        id: item.id,
        product_id: item.code,
        product_name: item.name,
        current_quantity: parseFloat(item.current_quantity),
        unit: item.unit,
        location: item.location,
        category: item.category,
        minimum_stock: parseFloat(item.minimum_stock),
        description: item.description
      })).filter(item => item.product_id || item.product_name);
      
      setInventoryItems(processedItems);
      
      // 處理低庫存數據
      if (lowStockData && lowStockData.data && Array.isArray(lowStockData.data)) {
        console.log('設置低庫存數據:', lowStockData.data);
        setLowStockItems(lowStockData.data);
      } else {
        console.error('低庫存數據格式不正確:', lowStockData);
      }
      
      setSyncStatus({ 
        loading: false, 
        message: `同步完成! 總項目: ${processedItems.length}` 
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
  
  // 處理刪除確認
  const handleDelete = async (record) => {
    Modal.confirm({
      title: '確認刪除',
      icon: <ExclamationCircleOutlined />,
      content: `確定要刪除 ${record.product_name} (${record.product_id}) 嗎？此操作無法撤銷。`,
      okText: '確認',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteInventoryItem(record.id);
          message.success('刪除成功');
          loadInventoryItems(); // 重新加載數據
        } catch (error) {
          message.error(error.message || '刪除失敗');
        }
      }
    });
  };

  const columns = [
    {
      title: 'QR碼',
      key: 'qr_code',
      width: 100,
      render: (_, record) => (
        <Popover 
          content={
            <div style={{ padding: '8px' }}>
              <QRCodeSVG 
                value={record.product_id}
                size={128}
                level="H"
                includeMargin={true}
                style={{ display: 'block' }}
              />
            </div>
          }
          title={`${record.product_name} (${record.product_id})`}
          trigger="click"
          placement="right"
        >
          <Button type="link" size="small">
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
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          {user?.role === 'admin' && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            >
              刪除
            </Button>
          )}
        </Space>
      ),
    }
  ];
  
  const summary = (pageData) => {
    const totalItems = pageData.length;

    return (
      <>
        <Table.Summary.Row>
          <Table.Summary.Cell colSpan={5}>
            <Space direction="vertical">
              <Text>總商品數: {totalItems}</Text>
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

  // 加載統計數據
  const loadStats = async () => {
    try {
      const response = await fetchInventoryStats();
      console.log('獲取到的統計數據:', response);
      if (response.success && response.data) {
        setStats({
          total_items: response.data.length || 0,
          low_stock_count: (response.data.filter(item => 
            parseFloat(item.quantity) <= parseFloat(item.minimum_stock)
          )).length || 0
        });
      }
    } catch (err) {
      console.error('載入統計數據失敗:', err);
      message.error('載入統計數據失敗');
    }
  };

  useEffect(() => {
    loadStats();
  }, [inventoryItems]); // 當庫存項目更新時重新計算統計

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
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>庫存管理</span>
            <Button 
              type="primary" 
              onClick={() => navigate('/')}
              icon={<HomeOutlined />}
            >
              返回主頁
            </Button>
          </div>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 統計數據卡片 */}
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card>
                <Statistic
                  title="總庫存項目"
                  value={inventoryItems?.length || 0}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Statistic
                  title="低庫存商品"
                  value={lowStockItems?.length || 0}
                  valueStyle={{ color: (lowStockItems?.length || 0) > 0 ? '#cf1322' : '#3f8600' }}
                />
              </Card>
            </Col>
          </Row>

          <div className="flex justify-between items-center">
            <Space>
              <Button type="primary" onClick={() => navigate('/inventory/list')}>
                查看完整庫存清單
              </Button>
              {user?.role === 'admin' && (
                <>
                  <Button onClick={() => setShowNewItemForm(true)}>
                    新增庫存項目
                  </Button>
                  <Button onClick={() => setShowScanner(true)}>
                    掃描 QR Code
                  </Button>
                  <Button onClick={() => navigate('/inventory/batch-update')}>
                    批量更新
                  </Button>
                </>
              )}
            </Space>
            <Search
              placeholder="搜索商品名稱或編號"
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
            dataSource={displayData}
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