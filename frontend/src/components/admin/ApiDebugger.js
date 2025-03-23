// 位置：frontend/src/components/admin/ApiDebugger.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Input } from '../ui';

/**
 * API 調試組件 - 用於診斷 API 連接問題
 * 可以添加到管理員儀表板或工作日誌審核頁面
 */
const ApiDebugger = ({ onClose }) => {
  const [apiUrl, setApiUrl] = useState(process.env.REACT_APP_API_URL || 'http://localhost:3002/api');
  const [endpoint, setEndpoint] = useState('/work-logs/search');
  const [params, setParams] = useState({
    status: 'pending',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  // 載入 token
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  // 處理參數變更
  const handleParamChange = (key, value) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 發送 API 請求
  const sendRequest = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('發送測試請求:', `${apiUrl}${endpoint}`, params);
      
      // 構建 URL 參數
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key]) {
          queryParams.append(key, params[key]);
        }
      });

      // 發送請求
      const response = await axios.get(`${apiUrl}${endpoint}?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // 處理回應
      console.log('API 測試回應:', response);
      setResults({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        count: Array.isArray(response.data) ? response.data.length : 'N/A'
      });
    } catch (err) {
      console.error('API 測試失敗:', err);
      setError({
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 清除 API 快取
  const clearApiCache = () => {
    // 嘗試調用全局快取清除函數
    if (window.clearApiCache) {
      window.clearApiCache();
    }

    // 刷新頁面
    alert('快取已清除，頁面將重新載入');
    window.location.reload();
  };

  // 測試權限
  const testAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${apiUrl}/auth/test`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      alert(`認證測試成功: ${JSON.stringify(response.data)}`);
    } catch (err) {
      console.error('認證測試失敗:', err);
      setError({
        message: '認證測試失敗: ' + err.message,
        status: err.response?.status,
        data: err.response?.data
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4 bg-gray-800 text-white">
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">API 調試工具</h2>
        <Button onClick={onClose} variant="secondary" className="px-2 py-1">關閉</Button>
      </div>

      {/* API 設置 */}
      <div className="mb-4">
        <label className="block mb-1 text-sm font-semibold">API URL</label>
        <Input
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 text-sm font-semibold">端點</label>
        <Input
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          className="w-full"
        />
      </div>

      {/* 請求參數 */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">參數</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block mb-1 text-xs">狀態</label>
            <select
              value={params.status}
              onChange={(e) => handleParamChange('status', e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            >
              <option value="">全部</option>
              <option value="pending">待審核</option>
              <option value="approved">已核准</option>
              <option value="rejected">已拒絕</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 text-xs">日期</label>
            <Input
              type="date"
              value={params.startDate}
              onChange={(e) => {
                handleParamChange('startDate', e.target.value);
                handleParamChange('endDate', e.target.value);
              }}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex space-x-2 mb-4">
        <Button 
          onClick={sendRequest} 
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? '請求中...' : '發送請求'}
        </Button>
        <Button 
          onClick={testAuth} 
          variant="secondary"
          disabled={isLoading}
          className="flex-1"
        >
          測試權限
        </Button>
        <Button 
          onClick={clearApiCache} 
          variant="secondary"
          className="flex-1"
        >
          清除快取
        </Button>
      </div>

      {/* 錯誤顯示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-900 rounded-lg overflow-auto max-h-40">
          <h3 className="font-semibold text-red-300 mb-1">錯誤</h3>
          <p className="text-sm text-red-100 mb-1">{error.message}</p>
          {error.status && (
            <p className="text-sm text-red-200">狀態: {error.status} {error.statusText}</p>
          )}
          {error.data && (
            <pre className="text-xs text-red-200 mt-2 p-2 bg-red-950 rounded">
              {JSON.stringify(error.data, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* 結果顯示 */}
      {results && (
        <div className="p-3 bg-gray-700 rounded-lg">
          <h3 className="font-semibold mb-1">請求結果</h3>
          <div className="flex justify-between text-sm mb-1">
            <span>狀態: {results.status} {results.statusText}</span>
            <span>結果數量: {results.count}</span>
          </div>
          <div className="max-h-60 overflow-auto mt-2">
            <pre className="text-xs p-2 bg-gray-900 rounded">
              {JSON.stringify(results.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ApiDebugger;