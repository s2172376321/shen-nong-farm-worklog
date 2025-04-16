// 位置：frontend/src/components/common/OfflineIndicator.js
import React, { useEffect, useState } from 'react';
import { useApiStatus } from '../../context/ApiStatusProvider';

// 離線狀態指示器 - 顯示在頁面頂部的簡單通知條
const OfflineIndicator = () => {
  const { isApiReady } = useApiStatus();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);
  
  // 監聽線上/離線狀態變化
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // 當API或網絡狀態變化時決定是否顯示指示器
  useEffect(() => {
    // 如果網絡離線或API未就緒，顯示指示器
    const shouldShow = !isOnline || !isApiReady;
    
    // 如果狀態變更為顯示，直接顯示
    if (shouldShow) {
      setShowIndicator(true);
    } else {
      // 如果變更為不顯示，延遲關閉以避免閃爍
      const timeoutId = setTimeout(() => {
        setShowIndicator(false);
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, isApiReady]);
  
  // 不顯示時不渲染任何內容
  if (!showIndicator) {
    return null;
  }
  
  return (
    <div className={`fixed top-0 left-0 right-0 p-2 text-center text-white font-medium z-50 transition-all duration-500 ${
      !isOnline ? 'bg-red-600' : !isApiReady ? 'bg-yellow-600' : 'bg-gray-800'
    }`}>
      {!isOnline ? (
        <>
          <span className="mr-2">📶</span>
          您目前處於離線狀態，某些功能可能無法正常使用
        </>
      ) : !isApiReady ? (
        <>
          <span className="mr-2">🔌</span>
          無法連接到系統，數據可能不是最新的
        </>
      ) : (
        <>
          <span className="mr-2">✓</span>
          連接已恢復
        </>
      )}
    </div>
  );
};

export default OfflineIndicator;