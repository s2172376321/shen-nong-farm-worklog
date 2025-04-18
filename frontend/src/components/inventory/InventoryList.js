import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchInventoryItems } from '../../utils/inventoryApi';
import { Table, Card, Button, Tag, Typography, Space, Input, message } from 'antd';
import { SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import QuantityAdjustModal from './QuantityAdjustModal';

const { Text } = Typography;
const { Search } = Input;

const InventoryList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // 加載庫存數據
  const loadInventoryItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchInventoryItems();
      setInventoryItems(data);
    } catch (err) {
      console.error('載入庫存數據失敗:', err);
      setError('載入庫存數據失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryItems();
  }, []);

  // 處理搜索
  const handleSearch = (value) => {
    setSearchText(value);
  };

  // 處理調整完成
  const handleAdjustComplete = async () => {
    setShowAdjustModal(false);
    setSelectedItem(null);
    message.success('庫存調整成功');
    await loadInventoryItems(); // 重新加載數據
  };

  // 過濾數據
  const filteredData = inventoryItems.filter(item => 
    item.product_name.toLowerCase().includes(searchText.toLowerCase()) ||
    item.category.toLowerCase().includes(searchText.toLowerCase()) ||
    item.product_id.toLowerCase().includes(searchText.toLowerCase())
  );

  // 表格列定義
  const columns = [
    {
      title: '產品編號',
      dataIndex: 'product_id',
      key: 'product_id',
      sorter: (a, b) => a.product_id.localeCompare(b.product_id),
    },
    {
      title: '商品名稱',
      dataIndex: 'product_name',
      key: 'product_name',
      sorter: (a, b) => a.product_name.localeCompare(b.product_name),
    },
    {
      title: '類別',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color="blue">{category || '其他'}</Tag>
      ),
      sorter: (a, b) => (a.category || '').localeCompare(b.category || ''),
    },
    {
      title: '現有庫存',
      dataIndex: 'current_quantity',
      key: 'current_quantity',
      render: (quantity, record) => (
        <Text type={quantity <= record.min_quantity ? 'danger' : 'success'}>
          {parseFloat(quantity).toFixed(2)} {record.unit}
        </Text>
      ),
      sorter: (a, b) => a.current_quantity - b.current_quantity,
    },
    {
      title: '最低庫存',
      dataIndex: 'min_quantity',
      key: 'min_quantity',
      render: (quantity, record) => (
        <Text>{parseFloat(quantity).toFixed(2)} {record.unit}</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary"
            onClick={() => {
              setSelectedItem(record);
              setShowAdjustModal(true);
            }}
          >
            調整庫存
          </Button>
          <Button
            onClick={() => navigate(`/inventory/${record.id}`)}
          >
            詳情
          </Button>
        </Space>
      ),
    },
  ];

  if (error) {
    return (
      <Card>
        <div className="text-center text-red-500">
          <p>{error}</p>
          <Button onClick={loadInventoryItems}>重試</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="庫存清單" 
      extra={
        <Space>
          <Search
            placeholder="搜索商品名稱、編號或類別"
            allowClear
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 250 }}
          />
          <Button type="primary" onClick={() => navigate('/inventory')}>
            返回庫存管理
          </Button>
        </Space>
      }
    >
      <Table 
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 項`
        }}
      />

      {/* 調整數量彈窗 */}
      {showAdjustModal && selectedItem && (
        <QuantityAdjustModal
          item={selectedItem}
          onClose={() => {
            setShowAdjustModal(false);
            setSelectedItem(null);
          }}
          onComplete={handleAdjustComplete}
        />
      )}
    </Card>
  );
};

export default InventoryList; 