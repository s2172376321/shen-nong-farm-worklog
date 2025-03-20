// 位置：frontend/src/components/admin/AdminDiagnostic.js
// 完整管理員診斷工具

import React, { useState, useEffect } from 'react';
import { checkServerHealth, testAuth } from '../../utils/api';
import { Button, Card } from '../ui';

const AdminDiagnostic = ({ onClose }) => {
  const [diagnostics, setDiagnostics] = useState({
    serverStatus: 'checking',
    authStatus: 'checking',
    adminStatus: 'checking',
    dbStatus: 'checking',
    networkStatus: navigator.onLine ? 'online' : 'offline'
  });
  
  const [isRunning, setIsRunning] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState({});

  // 運行診斷
  useEffect(() => {
    if (!isRunning) return;
    
    const runDiagnostics = async () => {
      // 檢查伺服器健康狀態
      try {
        const serverHealth = await checkServerHealth();
        setDiagnostics(prev => ({
          ...prev,
          serverStatus: serverHealth.status
        }));
        setResults(prev => ({
          ...prev,
          server: serverHealth
        }));
      } catch (error) {
        setDiagnostics(prev => ({
          ...prev,
          serverStatus: 'error'
        }));
        setError(`檢查伺服器狀態失敗: ${error.message}`);
      }
      
      // 檢查認證狀態
      try {
        const authResult = await testAuth();
        setDiagnostics(prev => ({
          ...prev,
          authStatus: 'success',
          adminStatus: authResult.user?.role === 'admin' ? 'success' : 'error'
        }));
        setResults(prev => ({
          ...prev,
          auth: authResult
        }));
      } catch (error) {
        setDiagnostics(prev => ({
          ...prev,
          authStatus: 'error',
          adminStatus: 'error'
        }));
        setError(`檢查認證狀態失敗: ${error.message}`);
      }
      
      // 檢查數據庫連接
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/db-status`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const dbStatus = await response.json();
        setDiagnostics(prev => ({
          ...prev,
          dbStatus: dbStatus.status === 'connected' ? 'success' : 'error'
        }));
        setResults(prev => ({
          ...prev,
          database: dbStatus
        }));
      } catch (error) {
        setDiagnostics(prev => ({
          ...prev,
          dbStatus: 'error'
        }));
      }
      
      setIsRunning(false);
    };

    runDiagnostics();
  }, [isRunning]);

  // 重新執行診斷
  const handleRerunDiagnostics = () => {
    setIsRunning(true);
    setError(null);
  };

  // 修復登入狀態
  const handleFixAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <Card className="bg-gray-800 p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">管理員系統診斷工具</h2>
        <Button onClick={onClose} variant="secondary" className="px-2 py-1">
          關閉
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 伺服器狀態 */}
          <div className="p-4 bg-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2">伺服器狀態</h3>
            <div className={`flex items-center ${
              diagnostics.serverStatus === 'online' ? 'text-green-400' :
              diagnostics.serverStatus === 'offline' ? 'text-red-400' :
              diagnostics.serverStatus === 'checking' ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {diagnostics.serverStatus === 'checking' ? (
                <div className="animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent mr-2"></div>
              ) : (
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  diagnostics.serverStatus === 'online' ? 'bg-green-400' :
                  diagnostics.serverStatus === 'offline' ? 'bg-red-400' :
                  diagnostics.serverStatus === 'checking' ? 'bg-yellow-400' :
                  'bg-red-400'
                }`}></div>
              )}
              <span>
                {diagnostics.serverStatus === 'online' ? '伺服器在線' :
                 diagnostics.serverStatus === 'offline' ? '伺服器離線' :
                 diagnostics.serverStatus === 'checking' ? '檢查中...' :
                 '伺服器狀態錯誤'}
              </span>
            </div>
          </div>
          
          {/* 認證狀態 */}
          <div className="p-4 bg-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2">認證狀態</h3>
            <div className={`flex items-center ${
              diagnostics.authStatus === 'success' ? 'text-green-400' :
              diagnostics.authStatus === 'error' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {diagnostics.authStatus === 'checking' ? (
                <div className="animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent mr-2"></div>
              ) : (
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  diagnostics.authStatus === 'success' ? 'bg-green-400' :
                  diagnostics.authStatus === 'error' ? 'bg-red-400' :
                  'bg-yellow-400'
                }`}></div>
              )}
              <span>
                {diagnostics.authStatus === 'success' ? '認證有效' :
                 diagnostics.authStatus === 'error' ? '認證無效或過期' :
                 '檢查中...'}
              </span>
            </div>
          </div>
          
          {/* 管理員權限 */}
          <div className="p-4 bg-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2">管理員權限</h3>
            <div className={`flex items-center ${
              diagnostics.adminStatus === 'success' ? 'text-green-400' :
              diagnostics.adminStatus === 'error' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {diagnostics.adminStatus === 'checking' ? (
                <div className="animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent mr-2"></div>
              ) : (
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  diagnostics.adminStatus === 'success' ? 'bg-green-400' :
                  diagnostics.adminStatus === 'error' ? 'bg-red-400' :
                  'bg-yellow-400'
                }`}></div>
              )}
              <span>
                {diagnostics.adminStatus === 'success' ? '管理員權限有效' :
                 diagnostics.adminStatus === 'error' ? '無管理員權限' :
                 '檢查中...'}
              </span>
            </div>
          </div>
          
          {/* 數據庫狀態 */}
          <div className="p-4 bg-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2">數據庫狀態</h3>
            <div className={`flex items-center ${
              diagnostics.dbStatus === 'success' ? 'text-green-400' :
              diagnostics.dbStatus === 'error' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {diagnostics.dbStatus === 'checking' ? (
                <div className="animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent mr-2"></div>
              ) : (
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  diagnostics.dbStatus === 'success' ? 'bg-green-400' :
                  diagnostics.dbStatus === 'error' ? 'bg-red-400' :
                  'bg-yellow-400'
                }`}></div>
              )}
              <span>
                {diagnostics.dbStatus === 'success' ? '數據庫連接正常' :
                 diagnostics.dbStatus === 'error' ? '數據庫連接失敗' :
                 '檢查中...'}
              </span>
            </div>
          </div>
        </div>
        
        {/* 詳細診斷信息 */}
        <div className="bg-gray-700 p-4 rounded-lg text-sm">
          <h3 className="font-semibold mb-2">詳細診斷信息</h3>
          <table className="w-full">
            <tbody>
              <tr>
                <td className="py-1 pr-4 text-gray-400">網絡狀態</td>
                <td className={diagnostics.networkStatus === 'online' ? 'text-green-400' : 'text-red-400'}>
                  {diagnostics.networkStatus === 'online' ? '在線' : '離線'}
                </td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-gray-400">API 基礎地址</td>
                <td>{process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}</td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-gray-400">Token 存在</td>
                <td className={localStorage.getItem('token') ? 'text-green-400' : 'text-red-400'}>
                  {localStorage.getItem('token') ? '是' : '否'}
                </td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-gray-400">用戶資訊</td>
                <td>
                  {localStorage.getItem('user') ? 
                    JSON.parse(localStorage.getItem('user')).username : '未登入'}
                </td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-gray-400">角色</td>
                <td className={
                  localStorage.getItem('user') && 
                  JSON.parse(localStorage.getItem('user')).role === 'admin' ? 
                  'text-green-400' : 'text-red-400'
                }>
                  {localStorage.getItem('user') ? 
                    JSON.parse(localStorage.getItem('user')).role : '無角色'}
                </td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-gray-400">瀏覽器</td>
                <td>{navigator.userAgent}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* 試圖請求工作日誌 */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">工作日誌請求測試</h3>
          <p className="text-sm text-gray-300 mb-4">嘗試直接請求待審核工作日誌，檢查API響應</p>
          
          <Button 
            onClick={async () => {
              try {
                setError(null);
                const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/work-logs/search?status=pending`, {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  }
                });
                
                const result = await response.json();
                
                setResults(prev => ({
                  ...prev,
                  workLogTest: {
                    status: response.status,
                    success: response.ok,
                    count: Array.isArray(result) ? result.length : 0
                  }
                }));
                
                if (response.ok) {
                  setError(`成功獲取到 ${Array.isArray(result) ? result.length : 0} 條待審核工作日誌`);
                } else {
                  setError(`請求失敗: ${result.message || '未知錯誤'}`);
                }
              } catch (error) {
                setError(`測試請求失敗: ${error.message}`);
              }
            }}
          >
            測試工作日誌請求
          </Button>
          
          {results.workLogTest && (
            <div className="mt-2 text-sm">
              <p>
                狀態碼: 
                <span className={results.workLogTest.success ? 'text-green-400' : 'text-red-400'}>
                  {' '}{results.workLogTest.status}
                </span>
              </p>
              <p>
                返回記錄數: {results.workLogTest.count}
              </p>
            </div>
          )}
        </div>
        
        {/* 操作按鈕 */}
        <div className="flex space-x-4">
          <Button onClick={handleRerunDiagnostics} disabled={isRunning}>
            {isRunning ? '診斷中...' : '重新診斷'}
          </Button>
          <Button 
            onClick={handleFixAuth}
            variant="secondary"
          >
            清除登入狀態並重新登入
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AdminDiagnostic;