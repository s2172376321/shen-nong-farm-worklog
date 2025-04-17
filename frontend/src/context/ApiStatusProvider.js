// 位置：frontend/src/context/ApiStatusProvider.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
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
  const [retryAttempts, setRetryAttempts] = useState(0);
  
  // 檢查 API 狀態
  const checkApiStatus = useCallback(async () => {
    // 如果已經在檢查中，則不重複檢查
    if (isChecking) {
      console.log('已經在檢查中，跳過此次檢查');
      return;
    }
    
    setIsChecking(true);
    console.log('開始檢查 API 狀態...');
    
    try {
      const health = await checkServerHealth();
      console.log('API 回應:', health);
      
      if (health.status === 'online') {
        setApiStatus(health);
        setIsApiReady(true);
        setLastChecked(new Date());
        setRetryAttempts(0); // 重置重試次數
      } else {
        throw new Error(health.message || 'API 未就緒');
      }
    } catch (error) {
      console.error('API 檢查錯誤:', error);
      setApiStatus({
        status: 'error',
        message: error.message || '無法連接到後端服務',
      });
      setIsApiReady(false);
      
      // 如果重試次數小於3次，自動重試
      if (retryAttempts < 3) {
        console.log(`將在 3 秒後重試 (第 ${retryAttempts + 1} 次)`);
        setTimeout(() => {
          setRetryAttempts(prev => prev + 1);
          setCheckCount(prev => prev + 1);
        }, 3000);
      }
    } finally {
      setIsChecking(false);
      console.log('API 檢查完成');
    }
  }, [isChecking, retryAttempts]); // 只依賴真正需要的狀態
  
  // 手動重試檢查
  const retryCheck = useCallback(() => {
    setRetryAttempts(0); // 重置重試次數
    setCheckCount(prev => prev + 1);
  }, []); // 不需要任何依賴
  
  // 在應用程序啟動時檢查 API 狀態
  useEffect(() => {
    let intervalId;
    
    const runCheck = () => {
      checkApiStatus();
      
      // 定期檢查 API 狀態 (每 3 分鐘)
      intervalId = setInterval(() => {
        if (isApiReady) { // 只在 API 就緒時進行定期檢查
          checkApiStatus();
        }
      }, 3 * 60 * 1000);
    };

    runCheck();
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [checkCount, checkApiStatus, isApiReady]);
  
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