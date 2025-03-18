// 在 src/components/common/ApiDiagnostic.js 中建立新的診斷工具

import React, { useState, useEffect } from 'react';
import { checkServerHealth, testAuth } from '../../utils/api';
import { Button, Card } from '../ui';

const ApiDiagnostic = ({ onClose }) => {
  const [diagnosticState, setDiagnosticState] = useState({
    serverStatus: 'checking',
    serverMessage: '檢查伺服器狀態中...',
    authStatus: 'checking',
    authMessage: '檢查認證狀態中...',
    networkStatus: navigator.onLine ? 'online' : 'offline',
    token: !!localStorage.getItem('token'),
    tokenExpiry: null,
    apiBaseUrl: process.env.REACT_APP_API_URL || '未設置'
  });
  
  const [isRunning, setIsRunning] = useState(true);

  // 運行診斷
  useEffect(() => {
    if (!isRunning) return;
    
    const runDiagnostics = async () => {
      // 檢查伺服器健康狀態
      try {
        const serverHealth = await checkServerHealth();
        setDiagnosticState(prev => ({
          ...prev,
          serverStatus: serverHealth.status,
          serverMessage: serverHealth.message
        }));
      } catch (error) {
        setDiagnosticState(prev => ({
          ...prev,
          serverStatus: 'error',
          serverMessage: `檢查失敗: ${error.message}`
        }));
      }
      
      // 檢查認證狀態
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setDiagnosticState(prev => ({
            ...prev,
            authStatus: 'error',
            authMessage: 'Token 不存在'
          }));
        } else {
          // 解析 JWT 獲取過期時間
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            try {
              const payload = JSON.parse(atob(tokenParts[1]));
              const expiry = payload.exp ? new Date(payload.exp * 1000) : null;
              
              setDiagnosticState(prev => ({
                ...prev,
                tokenExpiry: expiry ? expiry.toLocaleString() : '無法解析'
              }));
            } catch (e) {
              console.error('解析 token 失敗:', e);
            }
          }
          
          // 測試 token 是否有效
          try {
            const authTest = await testAuth();
            setDiagnosticState(prev => ({
              ...prev,
              authStatus: 'success',
              authMessage: '認證有效'
            }));
          } catch (authError) {
            setDiagnosticState(prev => ({
              ...prev,
              authStatus: 'error',
              authMessage: `認證無效: ${authError.message}`
            }));
          }
        }
      } catch (error) {
        setDiagnosticState(prev => ({
          ...prev,
          authStatus: 'error',
          authMessage: `檢查失敗: ${error.message}`
        }));
      }
      
      setIsRunning(false);
    };

    runDiagnostics();
  }, [isRunning]);

  // 重新執行診斷
  const handleRerunDiagnostics = () => {
    setIsRunning(true);
  };

  return (
    <Card className="bg-gray-800 p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">API 連接診斷工具</h2>
        <Button onClick={onClose} variant="secondary" className="px-2 py-1">
          關閉
        </Button>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 伺服器狀態 */}
          <div className="p-4 bg-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2">伺服器狀態</h3>
            <div className={`flex items-center ${
              diagnosticState.serverStatus === 'online' ? 'text-green-400' :
              diagnosticState.serverStatus === 'offline' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {diagnosticState.serverStatus === 'checking' ? (
                <div className="animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent mr-2"></div>
              ) : (
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  diagnosticState.serverStatus === 'online' ? 'bg-green-400' :
                  diagnosticState.serverStatus === 'offline' ? 'bg-red-400' :
                  'bg-yellow-400'
                }`}></div>
              )}
              <span>{diagnosticState.serverMessage}</span>
            </div>
          </div>
          
          {/* 認證狀態 */}
          <div className="p-4 bg-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2">認證狀態</h3>
            <div className={`flex items-center ${
              diagnosticState.authStatus === 'success' ? 'text-green-400' :
              diagnosticState.authStatus === 'error' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {diagnosticState.authStatus === 'checking' ? (
                <div className="animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent mr-2"></div>
              ) : (
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  diagnosticState.authStatus === 'success' ? 'bg-green-400' :
                  diagnosticState.authStatus === 'error' ? 'bg-red-400' :
                  'bg-yellow-400'
                }`}></div>
              )}
              <span>{diagnosticState.authMessage}</span>
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
                <td className={diagnosticState.networkStatus === 'online' ? 'text-green-400' : 'text-red-400'}>
                  {diagnosticState.networkStatus === 'online' ? '在線' : '離線'}
                </td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-gray-400">API 基礎地址</td>
                <td>{diagnosticState.apiBaseUrl}</td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-gray-400">Token 存在</td>
                <td className={diagnosticState.token ? 'text-green-400' : 'text-red-400'}>
                  {diagnosticState.token ? '是' : '否'}
                </td>
              </tr>
              {diagnosticState.tokenExpiry && (
                <tr>
                  <td className="py-1 pr-4 text-gray-400">Token 過期時間</td>
                  <td>{diagnosticState.tokenExpiry}</td>
                </tr>
              )}
              <tr>
                <td className="py-1 pr-4 text-gray-400">瀏覽器</td>
                <td>{navigator.userAgent}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* 操作按鈕 */}
        <div className="flex space-x-4">
          <Button onClick={handleRerunDiagnostics} disabled={isRunning}>
            {isRunning ? '診斷中...' : '重新診斷'}
          </Button>
          <Button 
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
            variant="secondary"
          >
            清除登入狀態並重新登入
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ApiDiagnostic;