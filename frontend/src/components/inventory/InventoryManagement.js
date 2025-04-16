import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchInventoryItems, updateInventoryItem } from '../../utils/inventoryApi';
import { Button, Input, Card, Table, Modal, message } from 'antd';

function InventoryManagement() {
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

  if (isLoading) {
    return <div>載入中...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="inventory-management">
      <Card title="庫存管理">
        <div className="search-bar">
          <Input
            placeholder="搜索商品名稱或類別"
            value={searchTerm}
            onChange={handleSearch}
            style={{ width: 300 }}
          />
        </div>

        <Table
          dataSource={getFilteredItems()}
          columns={[
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
                <div>
                  <Button onClick={() => handleEdit(record)}>編輯</Button>
                </div>
              ),
            },
          ]}
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
      </Card>
    </div>
  );
}

export default InventoryManagement; 