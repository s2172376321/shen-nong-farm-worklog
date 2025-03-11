// 位置：frontend/src/hooks/useWorkLog.js
import { useState, useCallback } from 'react';
import { createWorkLog, searchWorkLogs, uploadCSV } from '../utils/api';

// 節流和快取管理
const createThrottleManager = () => {
  const requestCache = new Map();
  const throttleMap = new Map();

  return {
    throttle: (key, fn, delay = 2000) => {
      // 檢查是否有正在進行的請求
      if (throttleMap.has(key)) {
        return Promise.reject(new Error('Request throttled'));
      }

      // 檢查是否有可用的快取
      const cachedResult = requestCache.get(key);
      if (cachedResult && (Date.now() - cachedResult.timestamp) < 5000) {
        return Promise.resolve(cachedResult.data);
      }

      // 標記請求正在進行
      throttleMap.set(key, true);
      
      return fn()
        .then(result => {
          // 快取結果
          requestCache.set(key, {
            data: result,
            timestamp: Date.now()
          });
          return result;
        })
        .finally(() => {
          // 解除節流
          setTimeout(() => {
            throttleMap.delete(key);
          }, delay);
        });
    },
    clearCache: (key) => {
      if (key) {
        requestCache.delete(key);
      } else {
        requestCache.clear();
        throttleMap.clear();
      }
    }
  };
};

const throttleManager = createThrottleManager();

export const useWorkLog = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 提交工作日誌
  const submitWorkLog = useCallback(async (workLogData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await createWorkLog(workLogData);
      
      // 清除相關快取，確保最新數據
      throttleManager.clearCache();
      
      setIsLoading(false);
      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || '提交工作日誌失敗';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, []);

  // 上傳 CSV 文件
  const submitCSV = useCallback(async (csvFile) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await uploadCSV(csvFile);
      
      // 清除相關快取，確保最新數據
      throttleManager.clearCache();
      
      setIsLoading(false);
      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'CSV 檔案上傳失敗';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, []);

// 獲取工作日誌
const fetchWorkLogs = useCallback(async (filters) => {
  setIsLoading(true);
  setError(null);

  // 為篩選器創建一個唯一的快取鍵
  const cacheKey = `workLogs:${JSON.stringify(filters)}`;

  try {
    const response = await throttleManager.throttle(
      cacheKey, 
      () => searchWorkLogs(filters),
      5000 // 5秒內只允許一次相同請求
    );
    
    setIsLoading(false);
    return response;
  } catch (err) {
    // 特殊處理節流錯誤
    if (err.message === 'Request throttled') {
      console.warn('工作日誌請求過於頻繁');
      setError('請稍後再試');
    } else {
      const errorMessage = err.response?.data?.message || '查詢工作日誌失敗';
      setError(errorMessage);
    }
    
    setIsLoading(false);
    throw err;
  }
}, []);


  return {
    submitWorkLog,
    submitCSV,
    fetchWorkLogs,
    isLoading,
    error
  };
};