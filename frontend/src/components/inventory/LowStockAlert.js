import React from 'react';
import { Alert, List } from 'antd';

const LowStockAlert = ({ items, className }) => {
  if (!items || items.length === 0) return null;

  return (
    <Alert
      type="warning"
      className={className}
      message="低庫存警告"
      description={
        <List
          size="small"
          dataSource={items}
          renderItem={item => (
            <List.Item>
              <span>{item.product_name}</span>
              <span>當前庫存: {item.current_quantity} {item.unit}</span>
            </List.Item>
          )}
        />
      }
    />
  );
};

export default LowStockAlert; 