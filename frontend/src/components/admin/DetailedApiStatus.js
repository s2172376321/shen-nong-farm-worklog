// 位置：frontend/src/components/admin/DetailedApiStatus.js
import React, { useState, useEffect } from 'react';
import { getApiStatus, testAuth } from '../../utils/api';
import { useApiStatus } from '../../context/ApiStatusProvider';
import { Card, Button } from '../ui';

// 詳細 API 狀態監控組件 - 適合管理員使用
const DetailedApiStatus = () => {
  const { isApiReady, isChecking, apiStatus, retryCheck } = useApiStatus();
  const [detailedStatus, setDetailedStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);
  const [error, setError] = useState(null);
  
  // 獲取詳細 API 狀態
  const fetchDetailedStatus = async () => {
    setIsLoading(true);
    try {
      const result = await getApiStatus();
      setDetailedStatus(result);
      setError(null);
    } catch (err) {
      setError(err.message || '無法獲取詳細 API 狀態');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 測試認證狀態
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const result = await testAuth();
      setAuthStatus({
        status: 'success',
        message: '認證有效',
        data: result
      });
      setError(null);
    } catch (err) {
      setAuthStatus({
        status: 'error',
        message: '認證無效或已過期',
        error: err.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 在組件掛載時獲取詳細狀態
  useEffect(() => {
    fetchDetailedStatus();
  }, []);
  
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">API 狀態監控</h2>
      
      {/* 基本狀態卡片 */}
      <Card className="mb-6 p-4 bg-gray-800">
        <h3 className="text-lg font-semibold mb-2">基本狀態</h3>
        <div className="flex items-center mb-2">
          <div className={`h-3 w-3 rounded-full mr-2 ${
            isApiReady ? 'bg-green-500' : isChecking ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span>
            {isChecking ? '檢查中...' : isApiReady ? '已就緒' : '未就緒'}
          </span>
        </div>
        
        {apiStatus && (
          <div className="mt-2 text-sm">
            <p><strong>狀態:</strong> {apiStatus.status}</p>
            <p><strong>消息:</strong> {apiStatus.message}</p>
            {apiStatus.serverTime && (
              <p><strong>伺服器時間:</strong> {apiStatus.serverTime}</p>
            )}
          </div>
        )}
        
        <div className="mt-4">
          <Button onClick={retryCheck} disabled={isChecking} size="sm">
            {isChecking ? '檢查中...' : '刷新狀態'}
          </Button>
        </div>
      </Card>
      
      {/* 詳細狀態卡片 */}
      <Card className="mb-6 p-4 bg-gray-800">
        <h3 className="text-lg font-semibold mb-2">詳細狀態</h3>
        
        {error && (
          <div className="bg-red-900 text-white p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
          </div>
        ) : detailedStatus ? (
          <div className="bg-gray-700 p-3 rounded-lg overflow-x-auto">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">
              {JSON.stringify(detailedStatus, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-400">未獲取詳細狀態</p>
        )}
        
        <div className="mt-4">
          <Button onClick={fetchDetailedStatus} disabled={isLoading} size="sm">
            {isLoading ? '載入中...' : '獲取詳細狀態'}
          </Button>
        </div>
      </Card>
      
      {/* 認證測試卡片 */}
      <Card className="p-4 bg-gray-800">
        <h3 className="text-lg font-semibold mb-2">認證測試</h3>
        
        {authStatus && (
          <div className={`${
            authStatus.status === 'success' ? 'bg-green-900' : 'bg-red-900'
          } text-white p-3 rounded-lg mb-4`}>
            <p>{authStatus.message}</p>
            {authStatus.error && (
              <p className="text-sm mt-1">{authStatus.error}</p>
            )}
          </div>
        )}
        
        <div className="mt-4">
          <Button onClick={checkAuth} disabled={isLoading} size="sm">
            {isLoading ? '測試中...' : '測試認證狀態'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DetailedApiStatus;