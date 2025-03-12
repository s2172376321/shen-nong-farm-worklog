// 位置：frontend/src/utils/offlineStorage.js
// 這是完整的實際離線存儲解決方案，非模擬功能

const DB_NAME = 'worklogOfflineDB';
const DB_VERSION = 1;
const WORK_LOGS_STORE = 'workLogs';
const MASTER_DATA_STORE = 'masterData';

// 初始化數據庫
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error("IndexedDB 開啟失敗:", event.target.error);
      reject(event.target.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 創建工作日誌存儲庫
      if (!db.objectStoreNames.contains(WORK_LOGS_STORE)) {
        const workLogsStore = db.createObjectStore(WORK_LOGS_STORE, { keyPath: 'id', autoIncrement: true });
        workLogsStore.createIndex('createdAt', 'createdAt', { unique: false });
        workLogsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
      }
      
      // 創建主數據(區域、位置等)存儲庫
      if (!db.objectStoreNames.contains(MASTER_DATA_STORE)) {
        const masterDataStore = db.createObjectStore(MASTER_DATA_STORE, { keyPath: 'key' });
      }
    };
    
    request.onsuccess = (event) => {
      console.log("IndexedDB 連接成功");
      resolve(event.target.result);
    };
  });
};

// 保存主數據(區域、位置、工作類別等)
export const saveMasterData = async (key, data) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MASTER_DATA_STORE], 'readwrite');
    const store = transaction.objectStore(MASTER_DATA_STORE);
    
    const request = store.put({
      key,
      data,
      updatedAt: new Date().toISOString()
    });
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

// 獲取主數據
export const getMasterData = async (key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MASTER_DATA_STORE], 'readonly');
    const store = transaction.objectStore(MASTER_DATA_STORE);
    
    const request = store.get(key);
    
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.data);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// 保存工作日誌到離線存儲
export const saveWorkLog = async (workLog) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORK_LOGS_STORE], 'readwrite');
    const store = transaction.objectStore(WORK_LOGS_STORE);
    
    // 添加必要的元數據
    const enhancedWorkLog = {
      ...workLog,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
      offlineId: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` // 創建唯一ID
    };
    
    const request = store.add(enhancedWorkLog);
    
    request.onsuccess = (event) => {
      resolve({
        id: event.target.result,
        ...enhancedWorkLog
      });
    };
    request.onerror = () => reject(request.error);
  });
};

// 獲取所有待同步的工作日誌
export const getPendingWorkLogs = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORK_LOGS_STORE], 'readonly');
    const store = transaction.objectStore(WORK_LOGS_STORE);
    const index = store.index('syncStatus');
    
    const request = index.getAll('pending');
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// 獲取今日工作日誌
export const getTodayWorkLogs = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORK_LOGS_STORE], 'readonly');
    const store = transaction.objectStore(WORK_LOGS_STORE);
    const index = store.index('createdAt');
    
    // 獲取今天的開始和結束時間
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString();
    const tomorrowStr = tomorrow.toISOString();
    
    // 使用遊標進行範圍查詢
    const range = IDBKeyRange.bound(todayStr, tomorrowStr, false, true);
    const request = index.openCursor(range);
    
    const results = [];
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// 更新工作日誌同步狀態
export const updateWorkLogSyncStatus = async (id, status, serverId = null) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORK_LOGS_STORE], 'readwrite');
    const store = transaction.objectStore(WORK_LOGS_STORE);
    
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const workLog = getRequest.result;
      if (!workLog) {
        return reject(new Error('工作日誌不存在'));
      }
      
      workLog.syncStatus = status;
      workLog.syncedAt = new Date().toISOString();
      
      if (serverId) {
        workLog.serverId = serverId;
      }
      
      const updateRequest = store.put(workLog);
      
      updateRequest.onsuccess = () => resolve(workLog);
      updateRequest.onerror = () => reject(updateRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
};

// 實際的網絡監控功能
export const setupNetworkMonitoring = (onlineCallback, offlineCallback) => {
  const handleOnline = () => {
    console.log('網絡連接恢復');
    if (typeof onlineCallback === 'function') {
      onlineCallback();
    }
  };
  
  const handleOffline = () => {
    console.log('網絡連接中斷');
    if (typeof offlineCallback === 'function') {
      offlineCallback();
    }
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // 初始檢查
  if (navigator.onLine) {
    handleOnline();
  } else {
    handleOffline();
  }
  
  // 返回清理函數
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};