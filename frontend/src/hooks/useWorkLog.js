// 位置：frontend/src/hooks/useWorkLog.js
import { useState, useCallback } from 'react';
import { createWorkLog, searchWorkLogs, uploadCSV } from '../utils/api';

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
        console.log(`清除特定緩存: ${key}`);
      } else {
        // 清除所有緩存
        requestCache.clear();
        throttleMap.clear();
        console.log('清除所有緩存');
      }
    },
    
    // 清除所有工作日誌相關的緩存
    clearWorkLogCaches: () => {
      // 遍歷並刪除所有以 workLogs: 開頭的緩存鍵
      for (const key of requestCache.keys()) {
        if (typeof key === 'string' && key.startsWith('workLogs:')) {
          requestCache.delete(key);
          console.log(`清除工作日誌緩存: ${key}`);
        }
      }
      console.log('所有工作日誌緩存已清除');
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
    
    try {
      console.log('嘗試提交工作日誌:', JSON.stringify(workLogData, null, 2));
      
      // 確保 Content-Type 設置正確
      const response = await api.post('/work-logs', workLogData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('工作日誌提交成功:', response.data);
      
      // 清除相關快取
      apiCache.clear('workLogs');
      apiCache.clear('workStats');
      apiCache.clear('todayHour');
      
      setLastSuccessTime(Date.now());
      setIsLoading(false);
      return response.data;
    } catch (err) {
      console.error('提交工作日誌錯誤:', err);
      // 其他錯誤處理邏輯...
      setIsLoading(false);
      throw err;
    }
  });
  
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
        
        // 清除所有緩存，確保列表更新
        throttleManager.clearCache(); // 清除所有緩存
        console.log('CSV上傳成功 - 所有緩存已清除，確保列表顯示最新數據');
        
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

  // 改進的工作日誌獲取函數 - 增加強制刷新參數
  const fetchWorkLogs = useCallback(async (filters = {}, forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    // 為篩選器創建一個唯一的快取鍵
    const cacheKey = `workLogs:${JSON.stringify(filters)}`;
    
    try {
      console.log('嘗試獲取工作日誌，過濾條件:', filters, 
        forceRefresh ? '(強制刷新)' : '');
      
      // 如果強制刷新，先清除該緩存
      if (forceRefresh) {
        throttleManager.clearCache(cacheKey);
        console.log(`強制刷新: 已清除緩存 ${cacheKey}`);
      }
      
      const response = await throttleManager.throttle(
        cacheKey, 
        async () => {
          try {
            // 如果強制刷新，添加時間戳參數防止使用舊緩存
            const enhancedFilters = forceRefresh ? 
              { ...filters, _t: Date.now() } : filters;
              
            const data = await searchWorkLogs(enhancedFilters);
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

  // 新增函數：強制刷新工作日誌列表
  const forceRefreshWorkLogs = useCallback(async (filters = {}) => {
    console.log('開始強制刷新工作日誌列表');
    // 首先清除所有工作日誌相關緩存
    throttleManager.clearWorkLogCaches();
    // 使用強制刷新參數獲取最新數據
    return fetchWorkLogs(filters, true);
  }, [fetchWorkLogs]);

  return {
    submitWorkLog,
    uploadCSV: submitCSV,
    fetchWorkLogs,
    forceRefreshWorkLogs, // 新增強制刷新方法
    isLoading,
    error,
    clearCache: throttleManager.clearCache
  };
};