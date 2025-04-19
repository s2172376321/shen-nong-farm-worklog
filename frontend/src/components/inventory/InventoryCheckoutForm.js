import React, { useState } from 'react';
import { Modal, Form, Input, InputNumber, Button, message, Descriptions } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { createInventoryCheckout } from '../../utils/inventoryApi';

const InventoryCheckoutForm = ({ visible, onClose, onSuccess, inventoryItem }) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // 提交表單
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const values = await form.validateFields();
      
      // 檢查領用數量是否超過庫存
      if (values.quantity > inventoryItem.current_quantity) {
        throw new Error('領用數量不能超過當前庫存量');
      }

      // 構建領用記錄
      const checkoutData = {
        items: [{
          inventory_id: inventoryItem.id,
          product_id: inventoryItem.product_id,
          quantity: values.quantity
        }],
        user_id: user.id,
        user_name: values.user_name,
        purpose: values.purpose,
        checkout_date: new Date().toISOString()
      };

      // 調用 API 保存領用記錄
      await createInventoryCheckout(checkoutData);
      
      message.success('領用成功！');
      form.resetFields();
      onSuccess && onSuccess(checkoutData);
      onClose && onClose();
    } catch (err) {
      console.error('領用失敗:', err);
      message.error(err.message || '領用失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title="領用庫存"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isLoading}
          onClick={handleSubmit}
        >
          確認領用
        </Button>
      ]}
      width={720}
    >
      {inventoryItem && (
        <Descriptions
          title="商品資訊"
          bordered
          column={2}
          className="mb-4"
        >
          <Descriptions.Item label="商品編號">
            {inventoryItem.product_id}
          </Descriptions.Item>
          <Descriptions.Item label="商品名稱">
            {inventoryItem.product_name}
          </Descriptions.Item>
          <Descriptions.Item label="當前庫存">
            {inventoryItem.current_quantity} {inventoryItem.unit}
          </Descriptions.Item>
          <Descriptions.Item label="類別">
            {inventoryItem.category}
          </Descriptions.Item>
        </Descriptions>
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          user_name: user?.name || '',
        }}
      >
        <Form.Item
          name="user_name"
          label="領用人姓名"
          rules={[{ required: true, message: '請輸入領用人姓名' }]}
        >
          <Input placeholder="請輸入領用人姓名" />
        </Form.Item>

        <Form.Item
          name="quantity"
          label="領用數量"
          rules={[
            { required: true, message: '請輸入領用數量' },
            {
              type: 'number',
              min: 0.01,
              message: '領用數量必須大於 0'
            },
            {
              validator: (_, value) =>
                value <= inventoryItem?.current_quantity
                  ? Promise.resolve()
                  : Promise.reject(new Error('領用數量不能超過當前庫存量'))
            }
          ]}
        >
          <InputNumber
            min={0.01}
            max={inventoryItem?.current_quantity}
            placeholder="請輸入領用數量"
            style={{ width: '100%' }}
            addonAfter={inventoryItem?.unit}
          />
        </Form.Item>

        <Form.Item
          name="purpose"
          label="用途說明"
          rules={[{ required: true, message: '請輸入用途說明' }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="請簡述領用用途"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default InventoryCheckoutForm; 