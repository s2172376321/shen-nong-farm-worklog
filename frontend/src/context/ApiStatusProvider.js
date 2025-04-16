// 位置：frontend/src/context/ApiStatusProvider.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { checkServerHealth } from '../utils/api';

// 創建 API 狀態上下文
export const ApiStatusContext = createContext({
  isApiReady: false,
  isChecking: true,
  apiStatus: null,
  retryCheck: () => {},
  lastChecked: null
});

export const ApiStatusProvider = ({ children }) => {
  // API 狀態
  const [isApiReady, setIsApiReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [apiStatus, setApiStatus] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [checkCount, setCheckCount] = useState(0);
  
  // 檢查 API 狀態
  const checkApiStatus = async () => {
    setIsChecking(true);
    
    try {
      console.log("正在檢查後端 API 狀態...");
      const health = await checkServerHealth();
      
      console.log("API 狀態檢查結果:", health);
      
      setApiStatus(health);
      setIsApiReady(health.status === 'online');
      setLastChecked(new Date());
    } catch (error) {
      console.error("API 狀態檢查錯誤:", error);
      setApiStatus({
        status: 'error',
        message: '無法連接到後端服務',
        error: error.message
      });
      setIsApiReady(false);
    } finally {
      setIsChecking(false);
    }
  };
  
  // 重試檢查
  const retryCheck = () => {
    setCheckCount(prev => prev + 1);
  };
  
  // 在應用程序啟動時檢查 API 狀態
  useEffect(() => {
    checkApiStatus();
    
    // 定期檢查 API 狀態 (每 3 分鐘)
    const intervalId = setInterval(() => {
      checkApiStatus();
    }, 3 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [checkCount]);
  
  return (
    <ApiStatusContext.Provider 
      value={{ 
        isApiReady, 
        isChecking, 
        apiStatus, 
        retryCheck,
        lastChecked
      }}
    >
      {children}
    </ApiStatusContext.Provider>
  );
};

// 自定義 Hook 用於在其他組件中使用 API 狀態
export const useApiStatus = () => {
  const context = useContext(ApiStatusContext);
  if (!context) {
    throw new Error('useApiStatus 必須在 ApiStatusProvider 內使用');
  }
  return context;
};

export default ApiStatusProvider;