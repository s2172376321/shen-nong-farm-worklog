import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchInventoryItems } from '../../utils/inventoryApi';
import { Table, Card, Button, Tag, Typography, Space } from 'antd';
import { SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';

const { Text } = Typography;

const InventoryList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState('category');
  const [sortOrder, setSortOrder] = useState('ascend');

  // 加載庫存數據
  useEffect(() => {
    const loadInventoryItems = async () => {
      try {
        setIsLoading(true);
        const data = await fetchInventoryItems();
        setInventoryItems(data);
        setIsLoading(false);
      } catch (err) {
        console.error('載入庫存數據失敗:', err);
        setError('載入庫存數據失敗，請稍後再試');
        setIsLoading(false);
      }
    };

    loadInventoryItems();
  }, []);

  // 處理排序
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'ascend' ? 'descend' : 'ascend');
    } else {
      setSortField(field);
      setSortOrder('ascend');
    }
  };

  // 排序圖標
  const getSortIcon = (field) => {
    if (sortField === field) {
      return sortOrder === 'ascend' ? <SortAscendingOutlined /> : <SortDescendingOutlined />;
    }
    return null;
  };

  // 排序數據
  const sortedItems = [...inventoryItems].sort((a, b) => {
    const compareValue = (va, vb) => {
      if (va < vb) return sortOrder === 'ascend' ? -1 : 1;
      if (va > vb) return sortOrder === 'ascend' ? 1 : -1;
      return 0;
    };

    return compareValue(a[sortField], b[sortField]);
  });

  const columns = [
    {
      title: (
        <Space>
          類別
          <Button type="link" onClick={() => handleSort('category')} icon={getSortIcon('category')} />
        </Space>
      ),
      dataIndex: 'category',
      key: 'category',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: (
        <Space>
          商品名稱
          <Button type="link" onClick={() => handleSort('product_name')} icon={getSortIcon('product_name')} />
        </Space>
      ),
      dataIndex: 'product_name',
      key: 'product_name'
    },
    {
      title: (
        <Space>
          目前庫存
          <Button type="link" onClick={() => handleSort('current_quantity')} icon={getSortIcon('current_quantity')} />
        </Space>
      ),
      dataIndex: 'current_quantity',
      key: 'current_quantity',
      render: (quantity, record) => (
        <Text type={quantity <= record.min_quantity ? 'danger' : 'success'}>
          {quantity}
        </Text>
      )
    },
    {
      title: '最低庫存',
      dataIndex: 'min_quantity',
      key: 'min_quantity'
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="primary" onClick={() => navigate(`/inventory/${record.id}`)}>
            詳情
          </Button>
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return <div>載入中...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <Card 
      title="庫存清單" 
      extra={
        <Button type="primary" onClick={() => navigate('/inventory')}>
          返回庫存管理
        </Button>
      }
    >
      <Table 
        dataSource={sortedItems}
        columns={columns}
        rowKey="id"
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 項`
        }}
      />
    </Card>
  );
};

export default InventoryList; 