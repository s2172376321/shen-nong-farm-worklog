import React, { useState, useEffect } from 'react';
import { Form, message, Input, InputNumber, Select, TextArea, Button } from 'antd';
import axios from 'axios';

const InventoryForm = ({ item, onSuccess }) => {
  const [form] = Form.useForm();
  const [initialValues, setInitialValues] = useState({
    code: '',
    name: '',
    quantity: 0,
    unit: '個',
    category: '其他',
    minimum_stock: 0,
    description: ''
  });

  useEffect(() => {
    if (item) {
      setInitialValues({
        code: item.code || '',
        name: item.name || '',
        quantity: item.quantity || 0,
        unit: item.unit || '個',
        category: item.category || '其他',
        minimum_stock: item.minimum_stock || 0,
        description: item.description || ''
      });
      form.setFieldsValue({
        code: item.code || '',
        name: item.name || '',
        quantity: item.quantity || 0,
        unit: item.unit || '個',
        category: item.category || '其他',
        minimum_stock: item.minimum_stock || 0,
        description: item.description || ''
      });
    }
  }, [item, form]);

  const handleSubmit = async (values) => {
    try {
      const data = {
        code: values.code,
        name: values.name,
        quantity: parseFloat(values.quantity),
        unit: values.unit,
        category: values.category,
        minimum_stock: parseFloat(values.minimum_stock),
        description: values.description
      };

      if (item) {
        await axios.put(`/api/inventory/${item.id}`, data);
        message.success('庫存項目更新成功');
      } else {
        await axios.post('/api/inventory', data);
        message.success('庫存項目創建成功');
      }
      onSuccess();
    } catch (error) {
      message.error('操作失敗: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onFinish={handleSubmit}
      layout="vertical"
    >
      <Form.Item
        name="code"
        label="編號"
        rules={[{ required: true, message: '請輸入編號' }]}
      >
        <Input placeholder="請輸入編號" />
      </Form.Item>

      <Form.Item
        name="name"
        label="名稱"
        rules={[{ required: true, message: '請輸入名稱' }]}
      >
        <Input placeholder="請輸入名稱" />
      </Form.Item>

      <Form.Item
        name="quantity"
        label="數量"
        rules={[{ required: true, message: '請輸入數量' }]}
      >
        <InputNumber
          min={0}
          step={0.01}
          style={{ width: '100%' }}
          placeholder="請輸入數量"
        />
      </Form.Item>

      <Form.Item
        name="unit"
        label="單位"
        rules={[{ required: true, message: '請選擇單位' }]}
      >
        <Select placeholder="請選擇單位">
          <Select.Option value="個">個</Select.Option>
          <Select.Option value="公斤">公斤</Select.Option>
          <Select.Option value="公升">公升</Select.Option>
          <Select.Option value="包">包</Select.Option>
          <Select.Option value="箱">箱</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="category"
        label="類別"
        rules={[{ required: true, message: '請選擇類別' }]}
      >
        <Select placeholder="請選擇類別">
          <Select.Option value="種子">種子</Select.Option>
          <Select.Option value="肥料">肥料</Select.Option>
          <Select.Option value="農藥">農藥</Select.Option>
          <Select.Option value="工具">工具</Select.Option>
          <Select.Option value="其他">其他</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="minimum_stock"
        label="最低庫存"
        rules={[{ required: true, message: '請輸入最低庫存' }]}
      >
        <InputNumber
          min={0}
          step={0.01}
          style={{ width: '100%' }}
          placeholder="請輸入最低庫存"
        />
      </Form.Item>

      <Form.Item
        name="description"
        label="描述"
      >
        <TextArea rows={4} placeholder="請輸入描述" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          {item ? '更新' : '創建'}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default InventoryForm; 