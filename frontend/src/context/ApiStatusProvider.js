// 位置：frontend/src/context/ApiStatusProvider.js
import React, { createContext, useContext } from 'react';

const ApiStatusContext = createContext();

export const useApiStatus = () => {
  const context = useContext(ApiStatusContext);
  if (!context) {
    throw new Error('useApiStatus must be used within an ApiStatusProvider');
  }
  return context;
};

export const ApiStatusProvider = ({ children }) => {
  // 提供一個最小化的實現，始終返回在線狀態且不顯示提示
  const value = {
    isOnline: true,
    networkStatus: 'online',
    showStatus: false,
    setShowStatus: () => {} // 空函數，不執行任何操作
  };

  return (
    <ApiStatusContext.Provider value={value}>
      {children}
    </ApiStatusContext.Provider>
  );
};

export default ApiStatusProvider;