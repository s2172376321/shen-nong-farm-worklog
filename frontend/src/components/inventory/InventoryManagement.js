import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchInventoryItems, updateInventoryItem, updateInventoryItems, deleteInventoryItem, batchUpdateInventory } from '../../utils/inventoryApi';
import { Button, Card, Input, Table, Modal, message, Space, Form, Select, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';

const { Option } = Input.Select;

const InventoryManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    quantity: '',
    location: '',
    notes: ''
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [batchEditVisible, setBatchEditVisible] = useState(false);
  const [form] = Form.useForm();
  const [batchEditData, setBatchEditData] = useState({
    category: '',
    price: '',
    minStock: ''
  });
  const [batchEditModalVisible, setBatchEditModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  // 獲取庫存項目
  const loadInventoryItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchInventoryItems();
      setInventoryItems(data);
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

  // 處理搜索
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // 過濾項目
  const getFilteredItems = () => {
    return inventoryItems.filter(item => 
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // 打開編輯模態框
  const handleEdit = (item) => {
    setSelectedItem(item);
    setEditForm({
      quantity: item.current_quantity,
      location: item.location || '',
      notes: item.notes || ''
    });
    setShowEditModal(true);
  };

  // 處理編輯表單變更
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 保存編輯
  const handleSaveEdit = async () => {
    try {
      await updateInventoryItem(selectedItem.id, editForm);
      message.success('更新成功');
      setShowEditModal(false);
      loadInventoryItems();
    } catch (err) {
      console.error('更新失敗:', err);
      message.error('更新失敗，請稍後再試');
    }
  };

  const handleBatchEdit = () => {
    if (selectedItems.length === 0) {
      message.warning('請選擇要更新的商品');
      return;
    }
    setBatchEditVisible(true);
  };

  const handleBatchUpdate = async () => {
    if (selectedItems.length === 0) {
      message.warning('請選擇要更新的項目');
      return;
    }

    setIsBatchUpdating(true);
    try {
      // 準備批量更新數據
      const updateItems = selectedItems.map(item => ({
        id: item.id,
        ...batchEditData
      }));

      const response = await batchUpdateInventory(updateItems);
      
      if (response.success) {
        message.success('批量更新成功');
        setBatchEditModalVisible(false);
        setBatchEditData({
          category: '',
          price: '',
          minStock: ''
        });
        setSelectedItems([]);
        loadInventoryItems(); // 重新加載數據
      } else {
        throw new Error(response.message || '更新失敗');
      }
    } catch (error) {
      console.error('批量更新失敗:', error);
      message.error(error.message || '批量更新時發生錯誤');
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const rowSelection = {
    selectedRowKeys: selectedItems.map(item => item.id),
    onChange: (selectedRowKeys, selectedRows) => {
      setSelectedItems(selectedRows);
    }
  };

  // 批量編輯表單
  const BatchEditForm = () => (
    <Form layout="vertical">
      <Form.Item label="類別">
        <Select
          value={batchEditData.category}
          onChange={value => setBatchEditData(prev => ({ ...prev, category: value }))}
          allowClear
        >
          <Option value="食品">食品</Option>
          <Option value="飲料">飲料</Option>
          <Option value="日用品">日用品</Option>
        </Select>
      </Form.Item>
      <Form.Item label="價格">
        <InputNumber
          value={batchEditData.price}
          onChange={value => setBatchEditData(prev => ({ ...prev, price: value }))}
          min={0}
          precision={2}
          style={{ width: '100%' }}
        />
      </Form.Item>
      <Form.Item label="最低庫存">
        <InputNumber
          value={batchEditData.minStock}
          onChange={value => setBatchEditData(prev => ({ ...prev, minStock: value }))}
          min={0}
          style={{ width: '100%' }}
        />
      </Form.Item>
    </Form>
  );

  if (isLoading) {
    return <div>載入中...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const columns = [
    {
      title: '商品名稱',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: '類別',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: '數量',
      dataIndex: 'current_quantity',
      key: 'current_quantity',
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            編輯
          </Button>
          <Button 
            danger
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)}
          >
            刪除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="inventory-management">
      <div className="flex justify-between items-center mb-4">
        <Space>
          {user.role === 'admin' && (
            <>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/inventory/new')}
              >
                新增商品
              </Button>
              <Button
                icon={<EditOutlined />}
                onClick={() => setBatchEditModalVisible(true)}
                disabled={selectedItems.length === 0}
              >
                批量編輯
              </Button>
            </>
          )}
        </Space>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={handleBatchUpdate}
          disabled={selectedItems.length === 0}
          loading={isBatchUpdating}
          style={{ marginRight: 8 }}
        >
          批量更新
        </Button>
        <span style={{ marginLeft: 8 }}>
          已選擇 {selectedItems.length} 個項目
        </span>
      </div>

      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={getFilteredItems()}
        loading={isLoading}
        rowKey="id"
      />

      <Modal
        title="編輯庫存項目"
        open={showEditModal}
        onOk={handleSaveEdit}
        onCancel={() => setShowEditModal(false)}
      >
        <div className="edit-form">
          <div className="form-group">
            <label>數量</label>
            <Input
              type="number"
              name="quantity"
              value={editForm.quantity}
              onChange={handleEditChange}
            />
          </div>
          <div className="form-group">
            <label>位置</label>
            <Input
              name="location"
              value={editForm.location}
              onChange={handleEditChange}
            />
          </div>
          <div className="form-group">
            <label>備註</label>
            <Input.TextArea
              name="notes"
              value={editForm.notes}
              onChange={handleEditChange}
            />
          </div>
        </div>
      </Modal>

      {/* 批量編輯彈窗 */}
      <Modal
        title="批量編輯庫存項目"
        open={batchEditModalVisible}
        onOk={handleBatchUpdate}
        onCancel={() => {
          setBatchEditModalVisible(false);
          setBatchEditData({
            category: '',
            price: '',
            minStock: ''
          });
        }}
        confirmLoading={isBatchUpdating}
      >
        <Form layout="vertical">
          <Form.Item label="類別">
            <Select
              value={batchEditData.category}
              onChange={value => setBatchEditData(prev => ({ ...prev, category: value }))}
              allowClear
            >
              <Option value="食品">食品</Option>
              <Option value="飲料">飲料</Option>
              <Option value="日用品">日用品</Option>
            </Select>
          </Form.Item>
          <Form.Item label="價格">
            <InputNumber
              value={batchEditData.price}
              onChange={value => setBatchEditData(prev => ({ ...prev, price: value }))}
              min={0}
              precision={2}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="最低庫存">
            <InputNumber
              value={batchEditData.minStock}
              onChange={value => setBatchEditData(prev => ({ ...prev, minStock: value }))}
              min={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryManagement; 