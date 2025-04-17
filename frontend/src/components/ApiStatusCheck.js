import React from 'react';
import { useApiStatus } from '../context/ApiStatusProvider';
import { Button, Alert, Spin, Space, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

const ApiStatusCheck = () => {
  const { isApiReady, isChecking, apiStatus, retryCheck, lastChecked } = useApiStatus();

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString();
  };

  const renderStatus = () => {
    if (isChecking) {
      return (
        <Alert
          message={
            <Space>
              <Spin />
              <span>正在檢查 API 連接狀態...</span>
            </Space>
          }
          type="info"
        />
      );
    }

    if (isApiReady) {
      return (
        <Alert
          message={
            <Space>
              <span>API 連接正常</span>
              <Text type="secondary">
                上次檢查: {formatTime(lastChecked)}
              </Text>
            </Space>
          }
          type="success"
          showIcon
        />
      );
    }

    return (
      <Alert
        message="API 連接異常"
        description={
          <Space direction="vertical">
            <Text type="danger">{apiStatus?.message || '無法連接到後端服務'}</Text>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={retryCheck}
              loading={isChecking}
            >
              重試連接
            </Button>
          </Space>
        }
        type="error"
        showIcon
      />
    );
  };

  return null;
};

export default ApiStatusCheck; 