import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchInventoryItems, importInventoryCSV, exportInventoryCSV } from '../../utils/inventoryApi';
import { Table, Card, Button, Tag, Typography, Space, Input, message, Upload } from 'antd';
import { SortAscendingOutlined, SortDescendingOutlined, UploadOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import QuantityAdjustModal from './QuantityAdjustModal';
import api from '../../utils/api';

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
  const [uploading, setUploading] = useState(false);

  // 加載庫存數據
  const loadInventoryItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/inventory');
      console.log('獲取到的庫存數據:', response.data);
      
      if (Array.isArray(response.data)) {
        setInventoryItems(response.data);
      } else {
        console.error('返回的數據不是數組:', response.data);
        setError('數據格式錯誤');
        setInventoryItems([]);
      }
    } catch (err) {
      console.error('載入庫存數據失敗:', err);
      setError('載入庫存數據失敗，請稍後再試');
      setInventoryItems([]);
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

  const handleImport = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await importInventoryCSV(formData);
      message.success('成功導入 CSV 數據');
      loadInventoryItems(); // 重新加載數據
      return true;
    } catch (error) {
      console.error('CSV 導入失敗:', error);
      message.error('CSV 導入失敗');
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await exportInventoryCSV();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('導出 CSV 失敗:', error);
      message.error('導出 CSV 失敗');
    }
  };

  // 過濾數據
  const filteredData = inventoryItems.filter(item => {
    if (!item) return false;
    
    const searchLower = searchText.toLowerCase();
    const nameMatch = (item.name || '').toLowerCase().includes(searchLower);
    const codeMatch = (item.code || '').toLowerCase().includes(searchLower);
    const categoryMatch = (item.category || '').toLowerCase().includes(searchLower);
    
    return nameMatch || codeMatch || categoryMatch;
  });

  // 表格列定義
  const columns = [
    {
      title: '產品編號',
      dataIndex: 'code',
      key: 'code',
      render: (code) => code || '-',
    },
    {
      title: '商品名稱',
      dataIndex: 'name',
      key: 'name',
      render: (name) => name || '-',
    },
    {
      title: '類別',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color="blue">{category || '其他'}</Tag>
      ),
    },
    {
      title: '現有庫存',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity, record) => (
        <Text type={quantity <= (record.minimumStock || 0) ? 'danger' : 'success'}>
          {parseFloat(quantity || 0).toFixed(2)} {record.unit || '個'}
        </Text>
      ),
    },
    {
      title: '最低庫存',
      dataIndex: 'minimumStock',
      key: 'minimumStock',
      render: (minimumStock, record) => (
        <Text>{parseFloat(minimumStock || 0).toFixed(2)} {record.unit || '個'}</Text>
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
          {user.role === 'admin' && (
            <>
              <Upload
                accept=".csv"
                showUploadList={false}
                beforeUpload={handleImport}
                disabled={uploading}
              >
                <Button 
                  icon={<UploadOutlined />} 
                  loading={uploading}
                >
                  導入 CSV
                </Button>
              </Upload>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={handleExport}
              >
                導出 CSV
              </Button>
            </>
          )}
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