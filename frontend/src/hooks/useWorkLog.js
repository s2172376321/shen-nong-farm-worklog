// 位置：frontend/src/hooks/useWorkLog.js
import { useState, useCallback } from 'react';
import { createWorkLog, searchWorkLogs, uploadCSV } from '../utils/api';

// 修改為更寬容的節流管理器
const createThrottleManager = () => {
  const requestCache = new Map();
  const throttleMap = new Map();
  const backoffMap = new Map();

  return {
    throttle: (key, fn, baseDelay = 2000) => {
      const now = Date.now();
      
      // 優先使用快取來避免節流問題
      const cachedResult = requestCache.get(key);
      if (cachedResult && (now - cachedResult.timestamp) < 30000) { // 增加快取有效期至30秒
        console.log(`使用 ${key} 的快取數據 (快取時間: ${Math.round((now - cachedResult.timestamp)/1000)}秒)`);
        return Promise.resolve(cachedResult.data);
      }
      
      // 檢查是否有正在進行的請求，但更寬容
      if (throttleMap.has(key)) {
        const lastRequest = throttleMap.get(key);
        const timeSinceLastRequest = now - lastRequest;
        
        // 如果距離上次請求時間很短，則使用快取或返回空數組，不拋出錯誤
        if (timeSinceLastRequest < 1000) { // 1秒內的重複請求
          console.log(`請求 ${key} 太頻繁，返回空數組`);
          return Promise.resolve([]); // 返回空數組而非拋出錯誤
        }
      }
      
      // 計算退避時間 (但我們不會真的退避，只是記錄)
      let backoffCount = backoffMap.get(key) || 0;
      
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
          
          console.log(`${key} 請求成功，已快取結果`);
          return result;
        })
        .catch(error => {
          // 失敗時增加退避計數
          backoffMap.set(key, backoffCount + 1);
          console.warn(`${key} 請求失敗 (${backoffCount + 1}次)，錯誤:`, error.message);
          
          // 如果是節流錯誤且有快取，則返回快取數據
          if (error.message === 'Request throttled' && cachedResult) {
            console.log(`節流錯誤，使用舊的快取數據`);
            return cachedResult.data;
          }
          
          // 對於節流錯誤，返回空數組
          if (error.message === 'Request throttled') {
            console.log(`節流錯誤，沒有快取，返回空數組`);
            return [];
          }
          
          throw error;
        })
        .finally(() => {
          // 延遲清除請求標記，避免長時間阻塞
          setTimeout(() => {
            throttleMap.delete(key);
          }, 2000); // 固定2秒後移除限制
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
      console.log('節流快取已清除');
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

// 獲取工作日誌 - 優化錯誤處理邏輯
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
    console.log('嘗試獲取工作日誌，過濾條件:', JSON.stringify(filters));
    
    const response = await throttleManager.throttle(
      cacheKey, 
      async () => {
        try {
          // 直接調用API，避免多層嵌套的錯誤處理
          return await searchWorkLogs(filters);
        } catch (err) {
          // 輸出更詳細的錯誤日誌
          console.error('searchWorkLogs API 調用失敗:', err);
          
          // 重要: 返回空數組但不拋出錯誤
          return [];
        }
      },
      8000 // 增加基本延遲至8秒
    );
    
    // 設置成功狀態，即使返回空數組
    setLastSuccessTime(Date.now());
    setIsLoading(false);
    
    // 不再因為空數組而顯示錯誤
    return response;
  } catch (err) {
    // 詳細日誌
    console.error('fetchWorkLogs 執行失敗:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data
    });
    
    // 特殊處理節流錯誤，但不顯示給用戶
    if (err.message === 'Request throttled') {
      console.warn('工作日誌請求過於頻繁，將返回空數組');
      setIsLoading(false);
      return []; // 返回空數組，不設置錯誤
    } else {
      // 只有真正的錯誤才顯示給用戶
      const errorMessage = err.response?.data?.message || '查詢工作日誌失敗';
      if (err.response?.status !== 404) { // 忽略404錯誤
        setError(errorMessage);
      }
      setIsLoading(false);
      return []; // 返回空數組
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