// 位置：frontend/src/hooks/useWorkLog.js
import { useState, useCallback } from 'react';
import { createWorkLog, searchWorkLogs, uploadCSV } from '../utils/api';

// 節流和快取管理 - 使用指數退避策略
const createThrottleManager = () => {
  const requestCache = new Map();
  const throttleMap = new Map();
  const backoffMap = new Map();

  return {
    throttle: (key, fn, baseDelay = 2000) => {
      const now = Date.now();
      
      // 檢查是否有正在進行的請求
      if (throttleMap.has(key)) {
        return Promise.reject(new Error('Request throttled'));
      }

      // 檢查是否有可用的快取
      const cachedResult = requestCache.get(key);
      if (cachedResult && (now - cachedResult.timestamp) < 10000) { // 增加快取有效期至10秒
        console.log(`使用 ${key} 的快取數據`);
        return Promise.resolve(cachedResult.data);
      }
      
      // 計算退避時間
      let backoffCount = backoffMap.get(key) || 0;
      const delay = baseDelay * Math.pow(1.5, backoffCount); // 指數退避
      
      // 標記請求正在進行
      throttleMap.set(key, now);
      
      return fn()
        .then(result => {
          // 快取結果
          requestCache.set(key, {
            data: result,
            timestamp: now
          });
          
          // 重置退避計數
          backoffMap.delete(key);
          
          return result;
        })
        .catch(error => {
          // 失敗時增加退避計數
          backoffMap.set(key, backoffCount + 1);
          throw error;
        })
        .finally(() => {
          // 延遲解除節流，使用動態時間
          setTimeout(() => {
            throttleMap.delete(key);
          }, delay);
        });
    },
    
    clearCache: (key) => {
      if (key) {
        requestCache.delete(key);
        backoffMap.delete(key);
      } else {
        requestCache.clear();
        throttleMap.clear();
        backoffMap.clear();
      }
    },
    
    getCacheStatus: () => {
      return {
        cacheSize: requestCache.size,
        throttleSize: throttleMap.size,
        backoffEntries: Array.from(backoffMap.entries())
      };
    }
  };
};

const throttleManager = createThrottleManager();

export const useWorkLog = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSuccessTime, setLastSuccessTime] = useState(null);

  // 提交工作日誌 - 增加重試機制
  const submitWorkLog = useCallback(async (workLogData) => {
    setIsLoading(true);
    setError(null);
    
    // 計算重試延遲時間的函數
    const getRetryDelay = (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 10000);
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {
        const response = await createWorkLog(workLogData);
        
        // 清除相關快取，確保最新數據
        throttleManager.clearCache();
        setLastSuccessTime(Date.now());
        setIsLoading(false);
        return response;
      } catch (err) {
        retryCount++;
        
        // 如果是429錯誤(過多請求)，或節流錯誤，或網絡錯誤，則重試
        const shouldRetry = 
          (err.response && err.response.status === 429) || 
          err.message === 'Request throttled' ||
          err.message.includes('Network Error');
        
        if (shouldRetry && retryCount <= maxRetries) {
          const delay = getRetryDelay(retryCount);
          console.warn(`提交工作日誌失敗，${delay}ms後重試(${retryCount}/${maxRetries})...`);
          
          // 等待延遲後繼續循環
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // 已重試最大次數或非可重試錯誤
        const errorMessage = err.response?.data?.message || '提交工作日誌失敗';
        setError(errorMessage);
        setIsLoading(false);
        throw err;
      }
    }
  }, []);

  // 上傳 CSV 文件 - 增加重試機制
  const submitCSV = useCallback(async (csvFile) => {
    setIsLoading(true);
    setError(null);
    
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        const response = await uploadCSV(csvFile);
        
        // 清除相關快取，確保最新數據
        throttleManager.clearCache();
        setLastSuccessTime(Date.now());
        setIsLoading(false);
        return response;
      } catch (err) {
        retryCount++;
        
        // 確定是否應該重試
        const shouldRetry = 
          (err.response && err.response.status === 429) || 
          err.message === 'Request throttled' ||
          err.message.includes('Network Error');
        
        if (shouldRetry && retryCount <= maxRetries) {
          const delay = 2000 * retryCount;
          console.warn(`CSV上傳失敗，${delay}ms後重試(${retryCount}/${maxRetries})...`);
          
          // 等待延遲後繼續循環
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // 已重試最大次數或非可重試錯誤
        const errorMessage = err.response?.data?.message || 'CSV 檔案上傳失敗';
        setError(errorMessage);
        setIsLoading(false);
        throw err;
      }
    }
  }, []);

  // 獲取工作日誌 - 增強錯誤處理和重試邏輯
  const fetchWorkLogs = useCallback(async (filters) => {
    if (!filters) {
      console.warn('未提供過濾器，使用空對象');
      filters = {};
    }
    
    setIsLoading(true);
    setError(null);

    // 為篩選器創建一個唯一的快取鍵
    const cacheKey = `workLogs:${JSON.stringify(filters)}`;
    
    try {
      const response = await throttleManager.throttle(
        cacheKey, 
        async () => {
          try {
            return await searchWorkLogs(filters);
          } catch (err) {
            // 如果是特定錯誤，返回空數組而不是拋出錯誤
            if (err.message === 'Request throttled' || 
                (err.response && err.response.status === 429)) {
              console.warn('工作日誌請求受限，返回空數組');
              return [];
            }
            throw err;
          }
        },
        8000 // 增加基本延遲至8秒
      );
      
      setIsLoading(false);
      
      // 如果響應是空數組且從未成功過，設置警告
      if (Array.isArray(response) && response.length === 0 && !lastSuccessTime) {
        setError('無法獲取工作日誌，可能是連接問題');
      }
      
      return response;
    } catch (err) {
      // 特殊處理節流錯誤
      if (err.message === 'Request throttled') {
        console.warn('工作日誌請求過於頻繁');
        setError('請求頻率過高，請稍後再試');
        setIsLoading(false);
        return []; // 返回空數組，而不是拋出錯誤
      } else {
        const errorMessage = err.response?.data?.message || '查詢工作日誌失敗';
        setError(errorMessage);
        setIsLoading(false);
        
        // 對於特定錯誤，返回空數組而不是拋出錯誤
        if (err.response && (err.response.status === 429 || err.response.status === 503)) {
          console.warn('伺服器暫時無法處理請求，返回空數組');
          return [];
        }
        
        throw err;
      }
    }
  }, [lastSuccessTime]);

  return {
    submitWorkLog,
    submitCSV,
    fetchWorkLogs,
    isLoading,
    error,
    clearCache: throttleManager.clearCache, // 導出清除快取方法
    getThrottleStatus: throttleManager.getCacheStatus // 導出快取狀態獲取方法
  };
};