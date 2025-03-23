// 位置：frontend/src/hooks/useWorkLog.js
import { useState, useCallback } from 'react';
import { createWorkLog, searchWorkLogs, uploadCSV } from '../utils/api';
import api, { apiCache } from '../utils/api'; // 添加這行來導入 api 和 apiCache

// 改進的節流管理器
const createThrottleManager = () => {
  const requestCache = new Map();
  const throttleMap = new Map();
  
  return {
    throttle: (key, fn, baseDelay = 2000) => {
      const now = Date.now();
      
      // 優先使用快取來避免節流問題
      const cachedResult = requestCache.get(key);
      if (cachedResult && (now - cachedResult.timestamp) < 30000) { // 30秒快取
        console.log(`使用 ${key} 的快取數據`);
        return Promise.resolve(cachedResult.data);
      }
      
      // 檢查是否有正在進行的請求
      if (throttleMap.has(key)) {
        const lastRequest = throttleMap.get(key);
        const timeSinceLastRequest = now - lastRequest;
        
        if (timeSinceLastRequest < 1000) { // 1秒內的重複請求
          console.log(`請求 ${key} 太頻繁，使用快取或返回空數組`);
          return cachedResult ? Promise.resolve(cachedResult.data) : Promise.resolve([]);
        }
      }
      
      // 標記請求正在進行
      throttleMap.set(key, now);
      
      return fn()
        .then(result => {
          // 快取結果
          requestCache.set(key, {
            data: result,
            timestamp: now
          });
          
          console.log(`${key} 請求成功，已快取結果`);
          return result;
        })
        .catch(error => {
          console.warn(`${key} 請求失敗，錯誤:`, error.message);
          
          // 如果有快取，則返回快取數據
          if (cachedResult) {
            console.log(`請求失敗，使用舊的快取數據`);
            return cachedResult.data;
          }
          
          // 沒有快取時，確保返回空數組避免UI崩潰
          if (error.message === 'Request throttled' || !navigator.onLine) {
            return [];
          }
          
          throw error;
        })
        .finally(() => {
          // 延遲清除請求標記
          setTimeout(() => {
            throttleMap.delete(key);
          }, baseDelay);
        });
    },
    
    clearCache: (key) => {
      if (key) {
        requestCache.delete(key);
      } else {
        requestCache.clear();
        throttleMap.clear();
      }
      console.log('節流快取已清除');
    }
  };
};

const throttleManager = createThrottleManager();

export const useWorkLog = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSuccessTime, setLastSuccessTime] = useState(null);

  // 改進的工作日誌提交函數
  const submitWorkLog = useCallback(async (workLogData) => {
    setIsLoading(true);
    setError(null);
    
    // 計算重試延遲時間的函數
    const getRetryDelay = (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 10000);
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {
        // 添加詳細的日誌
        console.log(`嘗試提交工作日誌 (${retryCount}/${maxRetries})`, {
          startTime: workLogData.startTime,
          endTime: workLogData.endTime,
          position: workLogData.position_name,
          category: workLogData.work_category_name
        });
        
        const response = await createWorkLog(workLogData);
        
        // 清除相關快取，確保最新數據
        apiCache.clear('workLogs');
        apiCache.clear('workStats');
        apiCache.clear('todayHour');
        throttleManager.clearCache();
        setLastSuccessTime(Date.now());
        setIsLoading(false);
        
        // 更詳細的成功日誌
        console.log('工作日誌提交成功:', {
          id: response.workLogId,
          status: response.status
        });
        
        return response;
      } catch (err) {
        retryCount++;
        
        // 更詳細的錯誤處理
        console.error(`工作日誌提交失敗 (${retryCount}/${maxRetries}):`, {
          message: err.message,
          userMessage: err.userMessage,
          status: err.response?.status,
          data: err.response?.data
        });
        
        // 根據錯誤類型決定是否重試
        const shouldRetry = 
          (err.response && err.response.status === 429) || 
          err.message === 'Request throttled' ||
          err.message.includes('timeout') ||
          err.message.includes('Network Error');
        
        if (shouldRetry && retryCount <= maxRetries) {
          const delay = getRetryDelay(retryCount);
          console.warn(`將在 ${delay}ms 後重試...`);
          
          // 等待延遲後繼續循環
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // 已重試最大次數或非可重試錯誤
        setError(err.userMessage || err.response?.data?.message || '提交工作日誌失敗');
        setIsLoading(false);
        throw err;
      }
    }
  }, []);

  // 改進的 CSV 上傳函數
  const submitCSV = useCallback(async (csvFile) => {
    setIsLoading(true);
    setError(null);
    
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`嘗試上傳 CSV 文件 (${retryCount}/${maxRetries}):`, {
          fileName: csvFile.name,
          fileSize: csvFile.size
        });
        
        const response = await uploadCSV(csvFile);
        
        // 清除相關快取，確保最新數據
        apiCache.clear('workLogs');
        apiCache.clear('workStats'); 
        apiCache.clear('todayHour');
        throttleManager.clearCache();
        setLastSuccessTime(Date.now());
        setIsLoading(false);
        
        console.log('CSV 上傳成功:', response);
        return response;
      } catch (err) {
        retryCount++;
        
        console.error(`CSV 上傳失敗 (${retryCount}/${maxRetries}):`, {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data
        });
        
        // 確定是否應該重試
        const shouldRetry = 
          (err.response && err.response.status === 429) || 
          err.message === 'Request throttled' ||
          err.message.includes('timeout') ||
          err.message.includes('Network Error');
        
        if (shouldRetry && retryCount <= maxRetries) {
          const delay = 2000 * retryCount;
          console.warn(`將在 ${delay}ms 後重試...`);
          
          // 等待延遲後繼續循環
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // 已重試最大次數或非可重試錯誤
        setError(err.response?.data?.message || 'CSV 檔案上傳失敗');
        setIsLoading(false);
        throw err;
      }
    }
  }, []);

  // 改進的工作日誌獲取函數
  const fetchWorkLogs = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);

    // 為篩選器創建一個唯一的快取鍵
    const cacheKey = `workLogs:${JSON.stringify(filters)}`;
    
    try {
      console.log('嘗試獲取工作日誌，過濾條件:', filters);
      
      const response = await throttleManager.throttle(
        cacheKey, 
        async () => {
          try {
            const data = await searchWorkLogs(filters);
            // 確保返回的數據是數組
            return Array.isArray(data) ? data : [];
          } catch (err) {
            console.error('searchWorkLogs 調用失敗:', err);
            return []; // 返回空數組以避免UI崩潰
          }
        }
      );
      
      // 確保響應是數組格式
      const result = Array.isArray(response) ? response : [];
      
      console.log(`獲取到 ${result.length} 條工作日誌`);
      
      setLastSuccessTime(Date.now());
      setIsLoading(false);
      
      return result;
    } catch (err) {
      console.error('fetchWorkLogs 執行失敗:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      
      // 僅在真正的錯誤情況下設置錯誤
      if (err.response && err.response.status !== 404) {
        setError('查詢工作日誌失敗');
      }
      
      setIsLoading(false);
      return []; // 默認返回空數組
    }
  }, []);

  return {
    submitWorkLog,
    uploadCSV: submitCSV,
    fetchWorkLogs,
    isLoading,
    error,
    clearCache: throttleManager.clearCache
  };
};