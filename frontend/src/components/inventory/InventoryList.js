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
      
      // 檢查並處理不同的數據格式
      let items = [];
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        items = response.data.data;
      } else if (Array.isArray(response.data)) {
        items = response.data;
      } else if (response.data && Array.isArray(response.data.items)) {
        items = response.data.items;
      } else {
        console.error('返回的數據格式不正確:', response.data);
        throw new Error('數據格式錯誤');
      }
      
      // 確保所有必要的字段都存在
      items = items.map(item => ({
        id: item.id,
        product_id: item.product_id || '',
        product_name: item.product_name || '',
        category: item.category || '其他',
        current_quantity: parseFloat(item.current_quantity || 0).toFixed(2),
        min_quantity: parseFloat(item.min_quantity || 0).toFixed(2),
        unit: item.unit || '個',
        total_in: parseFloat(item.total_in || 0).toFixed(2),
        total_out: parseFloat(item.total_out || 0).toFixed(2)
      }));
      
      setInventoryItems(items);
    } catch (err) {
      console.error('載入庫存數據失敗:', err);
      setError(err.message || '載入庫存數據失敗，請稍後再試');
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
      const response = await importInventoryCSV(formData);
      if (response.success) {
        message.success(response.message || '成功導入 CSV 數據');
        // 如果響應中包含數據，直接更新狀態
        if (Array.isArray(response.data)) {
          const processedItems = response.data.map(item => ({
            id: item.id || item['商品編號'],
            product_id: item.product_id || item['商品編號'],
            product_name: item.product_name || item['商品名稱'],
            unit: item.unit || item['單位'],
            current_quantity: parseFloat(item.current_quantity || item['數量']) || 0
          }));
          setInventoryItems(processedItems);
        } else {
          // 如果沒有數據，重新加載
          await loadInventoryItems();
        }
      } else {
        throw new Error(response.error || 'CSV 導入失敗');
      }
      return false; // 阻止 Upload 組件的默認上傳行為
    } catch (error) {
      console.error('CSV 導入失敗:', error);
      message.error(error.message || 'CSV 導入失敗');
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
    const nameMatch = (item.product_name || '').toLowerCase().includes(searchLower);
    const codeMatch = (item.product_id || '').toLowerCase().includes(searchLower);
    const categoryMatch = (item.category || '').toLowerCase().includes(searchLower);
    
    return nameMatch || codeMatch || categoryMatch;
  });

  // 表格列定義
  const columns = [
    {
      title: '產品編號',
      dataIndex: 'product_id',
      key: 'product_id',
      render: (product_id) => product_id || '-',
    },
    {
      title: '商品名稱',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (product_name) => product_name || '-',
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
      dataIndex: 'current_quantity',
      key: 'current_quantity',
      render: (current_quantity, record) => (
        <Text type={current_quantity <= (record.min_quantity || 0) ? 'danger' : 'success'}>
          {parseFloat(current_quantity || 0).toFixed(2)} {record.unit || '個'}
        </Text>
      ),
    },
    {
      title: '最低庫存',
      dataIndex: 'min_quantity',
      key: 'min_quantity',
      render: (min_quantity, record) => (
        <Text>{parseFloat(min_quantity || 0).toFixed(2)} {record.unit || '個'}</Text>
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
          {user?.role === 'admin' && (
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