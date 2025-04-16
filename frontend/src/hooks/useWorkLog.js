// 位置：frontend/src/hooks/useWorkLog.js
import { useState, useCallback, useRef, useEffect } from 'react';
import { createWorkLog, searchWorkLogs, uploadCSV } from '../utils/api';

// 工作日誌快取管理器
const workLogCache = {
  data: {},
  timestamps: {},
  
  // 設置快取資料
  set: function(key, value) {
    this.data[key] = value;
    this.timestamps[key] = Date.now();
  },
  
  // 獲取快取資料
  get: function(key, maxAge = 60000) { // 預設1分鐘過期
    const item = this.data[key];
    const timestamp = this.timestamps[key];
    
    if (!item || !timestamp) return null;
    
    // 檢查是否過期
    if (Date.now() - timestamp > maxAge) {
      delete this.data[key];
      delete this.timestamps[key];
      return null;
    }
    
    return item;
  },
  
  // 清除特定鍵或所有快取
  clear: function(key) {
    if (key) {
      delete this.data[key];
      delete this.timestamps[key];
    } else {
      this.data = {};
      this.timestamps = {};
    }
  }
};

export const useWorkLog = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSuccessTime, setLastSuccessTime] = useState(null);
  const [manualRefreshCount, setManualRefreshCount] = useState(0);
  
  // 用於追蹤請求狀態的 ref
  const requestStatusRef = useRef({
    pendingRequests: 0,
    inProgress: false
  });

  // 初始加載完成標誌
  const initialLoadDoneRef = useRef(false);
  
  // 用於記錄最後查詢時間
  const lastQueryTimeRef = useRef({
    workLogs: 0,
    todayHour: 0
  });
  
  // 監聽頁面可見性變化，在頁面激活時可以觸發刷新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 頁面變為可見狀態，檢查是否需要刷新數據
        const now = Date.now();
        const lastLoadTime = Math.max(lastQueryTimeRef.current.workLogs, lastQueryTimeRef.current.todayHour);
        
        // 如果上次加載距離現在超過5分鐘，自動刷新
        if (now - lastLoadTime > 5 * 60 * 1000) {
          console.log('頁面重新激活，觸發數據刷新');
          setManualRefreshCount(prev => prev + 1);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 提交工作日誌函數
  const submitWorkLog = useCallback(async (workLogData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await createWorkLog(workLogData);
      
      // 清除快取，確保下次獲取最新數據
      workLogCache.clear();
      setLastSuccessTime(Date.now());
      
      setIsLoading(false);
      return response;
    } catch (err) {
      console.error('工作日誌提交失敗:', err);
      setError(err.userMessage || err.message || '提交工作日誌失敗');
      setIsLoading(false);
      throw err;
    }
  }, []);

  // 上傳 CSV 檔案
  const uploadWorkLogCSV = useCallback(async (csvFile) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await uploadCSV(csvFile);
      
      // 清除快取
      workLogCache.clear();
      setLastSuccessTime(Date.now());
      
      setIsLoading(false);
      return result;
    } catch (err) {
      console.error('CSV 上傳失敗:', err);
      setError(err.message || 'CSV 檔案上傳失敗');
      setIsLoading(false);
      throw err;
    }
  }, []);

  // 優化後的工作日誌查詢函數
  const fetchWorkLogs = useCallback(async (filters = {}, options = {}) => {
    const { forceRefresh = false, maxCacheAge = 60000 } = options;
    
    // 計算快取鍵
    const cacheKey = `workLogs:${JSON.stringify(filters)}`;
    
    // 檢查是否已有進行中的請求或距離上次請求時間太短
    const now = Date.now();
    const timeSinceLastQuery = now - lastQueryTimeRef.current.workLogs;
    
    if (!forceRefresh && requestStatusRef.current.inProgress) {
      console.log('已有進行中的請求，跳過');
      return workLogCache.get(cacheKey) || [];
    }
    
    // 檢查是否有快取並且強制刷新標誌未設置
    if (!forceRefresh) {
      const cachedData = workLogCache.get(cacheKey, maxCacheAge);
      if (cachedData) {
        console.log('使用快取的工作日誌數據');
        return cachedData;
      }
    }

    // 如果不是強制刷新且距離上次請求不到2秒，使用上次的數據
    if (!forceRefresh && timeSinceLastQuery < 2000) {
      console.log(`距離上次請求僅 ${timeSinceLastQuery}ms，使用上次數據`);
      return workLogCache.get(cacheKey) || [];
    }
    
    // 標記請求正在進行
    requestStatusRef.current.inProgress = true;
    requestStatusRef.current.pendingRequests++;
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('發送工作日誌查詢請求:', filters);
      lastQueryTimeRef.current.workLogs = now;
      
      const data = await searchWorkLogs(filters);
      
      // 儲存到快取
      workLogCache.set(cacheKey, data);
      
      setIsLoading(false);
      setLastSuccessTime(now);
      initialLoadDoneRef.current = true;
      
      return data;
    } catch (err) {
      console.error('查詢工作日誌失敗:', err);
      
      if (forceRefresh) {
        // 強制刷新時才設置錯誤
        setError('查詢工作日誌失敗，請稍後再試');
      }
      
      // 返回上次的快取數據，避免畫面空白
      const cachedData = workLogCache.get(cacheKey, Infinity);
      return cachedData || [];
    } finally {
      requestStatusRef.current.pendingRequests--;
      if (requestStatusRef.current.pendingRequests === 0) {
        requestStatusRef.current.inProgress = false;
      }
      setIsLoading(false);
    }
  }, []);

  // 主動刷新功能
  const refreshWorkLogs = useCallback(async (filters = {}) => {
    setManualRefreshCount(prev => prev + 1);
    return fetchWorkLogs(filters, { forceRefresh: true });
  }, [fetchWorkLogs]);

  // 清除快取
  const clearCache = useCallback((key) => {
    workLogCache.clear(key);
    console.log('工作日誌快取已清除');
  }, []);

  // 初始加載完成狀態
  const isInitialLoadDone = useCallback(() => {
    return initialLoadDoneRef.current;
  }, []);

  return {
    submitWorkLog,
    uploadCSV: uploadWorkLogCSV,
    fetchWorkLogs,
    refreshWorkLogs,
    isLoading,
    error,
    clearCache,
    isInitialLoadDone,
    manualRefreshCount
  };
};