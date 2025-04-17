// 位置：frontend/src/utils/api.js
import axios from 'axios';

// 快取存儲
const apiCache = {
  data: {},
  set: function(key, value, ttl = 300000) {
    this.data[key] = {
      value,
      expiry: Date.now() + ttl
    };
  },
  get: function(key) {
    const item = this.data[key];
    if (!item) return null;
    if (Date.now() > item.expiry) {
      delete this.data[key];
      return null;
    }
    return item.value;
  },
  clear: function(key) {
    if (key) {
      delete this.data[key];
    } else {
      this.data = {};
    }
  }
};

// 創建 axios 實例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3002/api',
  withCredentials: true,
  timeout: 30000,  // 增加超時時間到30秒
  headers: {
    'Content-Type': 'application/json'
  }
});

// 請求攔截器
api.interceptors.request.use(
  config => {
    // 添加時間戳防止快取
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    
    // 添加 token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('發送請求:', {
      url: config.url,
      method: config.method,
      params: config.params
    });
    
    return config;
  },
  error => {
    console.error('請求配置錯誤:', error);
    return Promise.reject(error);
  }
);

// 響應攔截器
api.interceptors.response.use(
  response => {
    console.log('請求成功:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('請求失敗:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    // 處理特定錯誤
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('請求超時，請檢查網絡連接'));
    }

    if (!error.response) {
      return Promise.reject(new Error('無法連接到伺服器，請檢查網絡連接'));
    }

    // 處理特定 HTTP 狀態碼
    switch (error.response.status) {
      case 401:
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(new Error('認證已過期，請重新登入'));
      case 403:
        return Promise.reject(new Error('您沒有權限執行此操作'));
      case 404:
        return Promise.reject(new Error('找不到請求的資源'));
      case 500:
        return Promise.reject(new Error('伺服器內部錯誤，請稍後再試'));
      default:
        return Promise.reject(error.response.data?.message || error.message || '請求失敗');
    }
  }
);

// ----- WebSocket API -----
// WebSocket 連接類
export class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
  }

  // 連接到 WebSocket 伺服器
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket 已連接或正在連接中');
      return;
    }

    try {
      console.log('嘗試連接 WebSocket...');
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3002/ws';
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = this.onOpen.bind(this);
      this.socket.onmessage = this.onMessage.bind(this);
      this.socket.onerror = this.onError.bind(this);
      this.socket.onclose = this.onClose.bind(this);
    } catch (error) {
      console.error('WebSocket 連接錯誤:', error);
      this.attemptReconnect();
    }
  }

  // 連接成功回調
  onOpen() {
    console.log('WebSocket 連接成功');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.emit('connected');
  }

  // 收到消息回調
  onMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('收到 WebSocket 消息:', data);
      this.emit(data.type, data.data);
    } catch (error) {
      console.error('解析 WebSocket 消息錯誤:', error);
    }
  }

  // 錯誤回調
  onError(error) {
    console.error('WebSocket 錯誤:', error);
    this.emit('error', error);
  }

  // 連接關閉回調
  onClose(event) {
    console.log('WebSocket 連接關閉:', event);
    this.isConnected = false;
    this.emit('disconnected');
    this.attemptReconnect();
  }

  // 嘗試重新連接
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('重連次數已達上限，停止重連');
      return;
    }

    this.reconnectAttempts++;
    console.log(`嘗試重連 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 3000); // 3秒後重連
  }

  // 發送消息
  send(type, data) {
    if (!this.isConnected) {
      console.warn('WebSocket 未連接，無法發送消息');
      return false;
    }

    try {
      const message = JSON.stringify({ type, data });
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('發送 WebSocket 消息錯誤:', error);
      return false;
    }
  }

  // 關閉連接
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
    clearTimeout(this.reconnectTimeout);
  }

  // 註冊事件監聽
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // 發送事件通知
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`執行 ${event} 監聽器錯誤:`, error);
        }
      });
    }
  }
}

// 創建 WebSocket 服務實例
export const websocket = new WebSocketService();

// ----- 認證相關 API -----
export const loginUser = async (username, password) => {
  try {
    console.log('嘗試登入用戶:', username);
    const response = await api.post('/auth/login', { username, password });
    console.log('登入成功:', response.data);
    
    // 登入成功後連接 WebSocket
    websocket.connect();
    
    return response.data;
  } catch (error) {
    console.error('登入失敗:', error);
    throw error;
  }
};

export const googleLogin = async (credential) => {
  try {
    console.log('調用 API: 發送Google憑證，長度:', credential?.length);
    
    // 使用'token'參數名稱，與後端對應
    const response = await api.post('/auth/google-login', { token: credential });
    
    console.log('Google登入API成功');
    
    // 連接WebSocket
    websocket.connect();
    
    return response.data;
  } catch (error) {
    console.error('Google登入API失敗:', error);
    
    // 詳細日誌
    if (error.response) {
      console.error('伺服器回應:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('未收到伺服器回應:', error.request);
    } else {
      console.error('請求設置錯誤:', error.message);
    }
    
    throw error;
  }
};

export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const changePassword = async (oldPassword, newPassword) => {
  const response = await api.post('/auth/change-password', { 
    oldPassword, 
    newPassword 
  });
  return response.data;
};

export const logout = () => {
  // 登出時斷開 WebSocket 連接
  websocket.disconnect();
  
  // 清除本地存儲的資訊
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // 清除快取
  apiCache.clear();
};

// ----- 工作日誌 API -----
export const createWorkLog = async (workLogData) => {
  try {
    console.log('準備提交工作日誌數據:', workLogData);

    // 檢查必填欄位
    if (!workLogData.startTime && !workLogData.start_time) {
      throw new Error('缺少開始時間');
    }
    if (!workLogData.endTime && !workLogData.end_time) {
      throw new Error('缺少結束時間');
    }
    
    // 確保至少有位置或位置名稱
    if (!workLogData.location && !workLogData.position_name) {
      throw new Error('缺少位置資訊');
    }
    
    // 確保至少有作物或工作類別名稱
    if (!workLogData.crop && !workLogData.work_category_name) {
      throw new Error('缺少作物或工作類別資訊');
    }

    // 標準化欄位名稱，確保與後端一致
    const payload = {
      ...workLogData,
      // 確保必要欄位總是有值
      location: workLogData.location || workLogData.position_name || '',
      crop: workLogData.crop || workLogData.work_category_name || '',
      startTime: workLogData.startTime || workLogData.start_time || '',
      endTime: workLogData.endTime || workLogData.end_time || '',
      harvestQuantity: workLogData.harvestQuantity || workLogData.harvest_quantity || 0,
      details: workLogData.details || ''
    };
    
    // 顯示完整的發送數據，方便調試
    console.log('最終發送到後端的數據:', JSON.stringify(payload, null, 2));
    
    // 增加超時時間處理大請求
    const response = await api.post('/work-logs', payload, {
      timeout: 10000 // 10秒超時
    });
    
    console.log('工作日誌提交成功, 響應:', response.data);
    
    // 創建日誌後清除相關快取
    apiCache.clear('workLogs');
    apiCache.clear('userDailyWorkLogs');
    apiCache.clear('workStats');
    apiCache.clear('todayHour');
    
    return response.data;
  } catch (error) {
    console.error('提交工作日誌錯誤:', error);
    
    // 檢查錯誤類型並提供更好的錯誤訊息
    let userMessage = '提交工作日誌失敗';
    
    if (error.response) {
      // 服務器回應了錯誤
      console.error('服務器錯誤數據:', error.response.data);
      
      userMessage = error.response.data?.message || userMessage;
      
      if (error.response.status === 400) {
        userMessage = `提交數據格式有誤: ${error.response.data?.details || userMessage}`;
      } else if (error.response.status === 401) {
        userMessage = '您的登入已過期，請重新登入';
      } else if (error.response.status === 500) {
        userMessage = '伺服器內部錯誤，請稍後再試';
      }
    } else if (error.request) {
      // 請求已發送但沒有回應
      userMessage = '無法連接到伺服器，請檢查網路連接';
    } else {
      // 請求設置時出現問題
      userMessage = error.message || userMessage;
    }
    
    // 包裝錯誤信息
    const enhancedError = {
      ...error,
      userMessage,
      originalMessage: error.message
    };
    
    throw enhancedError;
  }
};

// 工作日誌查詢 - 統一實現
export const searchWorkLogs = async (filters) => {
  // 生成快取鍵
  const cacheKey = `workLogs:${JSON.stringify(filters)}`;
  
  // 詳細日誌
  console.log('searchWorkLogs 調用，過濾條件:', JSON.stringify(filters));
  
  // 檢查快取
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    console.log('使用快取的工作日誌數據');
    return cachedData;
  }
  
  try {
    console.log('開始發送工作日誌搜尋請求');
    
    // 實現漸進式超時策略 - 先快速嘗試，然後再增加超時時間重試
    let timeoutAttempts = 0;
    const maxTimeoutAttempts = 2;
    const timeouts = [8000, 20000]; // 第一次嘗試 8 秒，第二次 20 秒
    
    let lastError = null;
    
    while (timeoutAttempts <= maxTimeoutAttempts) {
      try {
        // 使用當前的超時時間
        const currentTimeout = timeouts[timeoutAttempts] || 30000;
        console.log(`嘗試搜尋工作日誌 (嘗試 ${timeoutAttempts+1}/${maxTimeoutAttempts+1}，超時: ${currentTimeout}ms)`);
        
        // 添加分頁參數，限制返回的結果數量
        const searchParams = {
          ...filters,
          limit: filters.limit || 100, // 限制每次請求最多返回100條記錄
          page: filters.page || 1      // 默認第一頁
        };
        
        const response = await api.get('/work-logs/search', { 
          params: searchParams,
          timeout: currentTimeout
        });
        
        console.log('工作日誌搜尋結果:', response.status, response.data?.length || 0);
        
        // 標準化日期和時間格式
        if (Array.isArray(response.data)) {
          const normalizedData = response.data.map(log => ({
            ...log,
            start_time: log.start_time?.substring(0, 5) || log.start_time,
            end_time: log.end_time?.substring(0, 5) || log.end_time,
            created_at: log.created_at || new Date().toISOString()
          }));
          
          // 儲存到快取
          apiCache.set(cacheKey, normalizedData, 60000); // 快取1分鐘
          
          return normalizedData;
        }
        
        console.warn('API返回了非數組數據:', response.data);
        return [];
      } catch (error) {
        lastError = error;
        
        // 如果是超時錯誤，並且還有重試次數，則嘗試增加超時時間重試
        if ((error.code === 'ECONNABORTED' || error.message.includes('timeout')) && timeoutAttempts < maxTimeoutAttempts) {
          console.warn(`請求超時 (${timeouts[timeoutAttempts]}ms)，將重試並增加超時時間...`);
          timeoutAttempts++;
        } else {
          // 其他錯誤或已達最大重試次數，跳出循環
          break;
        }
      }
    }
    
    // 所有嘗試都失敗，記錄詳細錯誤並處理
    console.error('搜尋工作日誌失敗 (所有嘗試):', {
      message: lastError?.message,
      status: lastError?.response?.status,
      statusText: lastError?.response?.statusText,
      url: lastError?.config?.url,
      params: JSON.stringify(lastError?.config?.params)
    });
    
    // 特殊錯誤處理
    if (lastError?.response?.status === 404) {
      console.log('沒有找到符合條件的工作日誌');
      return [];
    }
    
    // 網絡離線處理
    if (!navigator.onLine) {
      console.warn('瀏覽器處於離線狀態');
      return [];
    }
    
    // 身份驗證錯誤處理
    if (lastError?.response?.status === 401) {
      console.warn('身份驗證已過期，需要重新登入');
      return [];
    }
    
    // 若依然失敗，返回空數組避免UI崩潰
    return [];
  } catch (error) {
    console.error('searchWorkLogs 處理發生意外錯誤:', error);
    return [];
  }
};

// 日期特定查詢的別名函數
export const getWorkLogsByDate = async (workDate) => {
  if (!workDate) {
    console.warn('未提供工作日期，使用當天日期');
    workDate = new Date().toISOString().split('T')[0];
  }
  
  return searchWorkLogs({
    startDate: workDate,
    endDate: workDate
  });
};

// 工作日誌審核
export const reviewWorkLog = async (workLogId, status) => {
  try {
    console.log(`開始審核工作日誌:`, {
      workLogId,
      status,
      timestamp: new Date().toISOString()
    });
    
    const response = await api.patch(`/work-logs/${workLogId}/review`, { status });
    
    console.log(`工作日誌審核成功:`, {
      workLogId,
      status: response.data.status,
      reviewedAt: response.data.reviewedAt,
      timestamp: new Date().toISOString()
    });
    
    // 審核後清除相關快取
    apiCache.clear('workLogs');
    apiCache.clear('userDailyWorkLogs');
    apiCache.clear('workStats');
    
    return response.data;
  } catch (error) {
    console.error('審核工作日誌失敗:', {
      workLogId,
      status,
      error: error.response?.data || error.message,
      timestamp: new Date().toISOString()
    });
    
    // 根據錯誤類型返回不同的錯誤訊息
    if (error.response) {
      // 伺服器返回的錯誤
      throw new Error(error.response.data.message || '審核工作日誌失敗');
    } else if (error.request) {
      // 請求發送但沒有收到回應
      throw new Error('無法連接到伺服器，請檢查網路連接');
    } else {
      // 其他錯誤
      throw new Error('審核工作日誌時發生錯誤');
    }
  }
};

// 批量審核工作日誌
export const batchReviewWorkLogs = async (workLogIds, status) => {
  try {
    console.log(`批量審核 ${workLogIds.length} 條工作日誌，狀態: ${status}`);
    
    const response = await api.post('/work-logs/batch-review', {
      workLogIds,
      status
    });
    
    // 審核後清除相關快取
    apiCache.clear('workLogs');
    apiCache.clear('userDailyWorkLogs');
    apiCache.clear('workStats');
    
    return response.data;
  } catch (error) {
    console.error('批量審核工作日誌失敗:', error);
    throw error;
  }
};

// CSV 上傳工作日誌
export const uploadCSV = async (csvFile) => {
  try {
    console.log('開始上傳 CSV 檔案:', csvFile.name);
    
    const formData = new FormData();
    formData.append('csvFile', csvFile);
    
    const response = await api.post('/work-logs/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    // 上傳後清除相關快取
    apiCache.clear('workLogs');
    apiCache.clear('userDailyWorkLogs');
    apiCache.clear('workStats');
    apiCache.clear('todayHour');
    
    console.log('CSV 上傳成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('CSV 上傳失敗:', error);
    throw error;
  }
};

// 獲取今日工時統計
export const getTodayHour = async () => {
  // 檢查快取
  const cachedData = apiCache.get('todayHour');
  if (cachedData) {
    console.log('使用快取的今日工時數據');
    return cachedData;
  }
  
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount <= maxRetries) {
    try {
      console.log(`嘗試獲取今日工時 (${retryCount}/${maxRetries})`);
      
      // 使用增加的超時時間
      const response = await api.get('/work-logs/today-hour', {
        timeout: 10000 + (retryCount * 2000) // 隨著重試增加超時時間
      });
      
      const data = response.data;
      
      // 檢查數據格式
      if (!data || typeof data.total_hours === 'undefined') {
        throw new Error('回應數據格式不正確');
      }
      
      // 確保數據格式一致
      const formattedData = {
        total_hours: parseFloat(data.total_hours || 0).toFixed(2),
        remaining_hours: parseFloat(data.remaining_hours || 8).toFixed(2),
        is_complete: Boolean(data.is_complete)
      };
      
      // 快取時間
      apiCache.set('todayHour', formattedData, 180000); // 快取3分鐘
      
      console.log('成功獲取今日工時:', formattedData);
      return formattedData;
    } catch (error) {
      retryCount++;
      console.error(`獲取今日工時失敗 (${retryCount}/${maxRetries}):`, error.message);
      
      // 重試邏輯
      if (retryCount <= maxRetries) {
        const delay = 2000 * retryCount; // 隨著重試次數增加延遲
        console.log(`等待 ${delay}ms 後重試...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // 所有重試都失敗，返回默認值
        console.warn('多次重試後仍無法獲取今日工時，返回默認值');
        return {
          total_hours: "0.00",
          remaining_hours: "8.00",
          is_complete: false
        };
      }
    }
  }
  
  // 防止異常情況，確保返回默認值
  return {
    total_hours: "0.00",
    remaining_hours: "8.00",
    is_complete: false
  };
};

// 別名，保持向後兼容
export const getTodayWorkHours = getTodayHour;

// 用戶特定日期工作日誌
export const getUserDailyWorkLogs = async (userId, workDate) => {
  // 檢查快取
  const cacheKey = `userDailyWorkLogs:${userId}:${workDate}`;
  const cachedData = apiCache.get(cacheKey);
  
  if (cachedData) {
    console.log(`使用快取的用戶 ${userId} ${workDate} 工作日誌數據`);
    return cachedData;
  }
  
  try {
    console.log(`獲取用戶 ${userId} 在 ${workDate} 的工作日誌`);
    
    const response = await api.get('/work-logs/user-daily', { 
      params: { userId, workDate },
      timeout: 8000
    });
    
    // 標準化時間格式
    if (response.data.workLogs && Array.isArray(response.data.workLogs)) {
      response.data.workLogs = response.data.workLogs.map(log => ({
        ...log,
        start_time: log.start_time?.substring(0, 5) || log.start_time,
        end_time: log.end_time?.substring(0, 5) || log.end_time
      }));
    }
    
    // 存入快取
    apiCache.set(cacheKey, response.data, 300000); // 快取5分鐘
    
    return response.data;
  } catch (error) {
    console.error(`獲取用戶 ${userId} 在 ${workDate} 的工作日誌失敗:`, error);
    
    // 返回默認值，避免UI崩潰
    return {
      workLogs: [],
      totalHours: 0,
      isComplete: false
    };
  }
};

// 管理員獲取所有工作日誌
export const getAllWorkLogs = async () => {
  // 檢查快取
  const cachedData = apiCache.get('allWorkLogs');
  if (cachedData) {
    console.log('使用快取的所有工作日誌數據');
    return cachedData;
  }
  
  try {
    console.log('開始獲取所有工作日誌');
    const response = await api.get('/work-logs/all');
    
    // 儲存到快取 - 設置較長的快取時間，減少重複請求
    apiCache.set('allWorkLogs', response.data, 1800000); // 30分鐘快取
    
    return response.data;
  } catch (error) {
    console.error('獲取所有工作日誌失敗:', error);
    return [];
  }
};

// 獲取特定位置的作物列表
export const fetchLocationCrops = async (positionCode) => {
  // 檢查缓存
  const cacheKey = `locationCrops:${positionCode}`;
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    console.log(`使用快取的位置 ${positionCode} 作物列表数据`);
    return cachedData;
  }
  
  try {
    console.log(`嘗試獲取位置 ${positionCode} 的作物列表`);
    
    // 增加超時設置
    const response = await api.get(`/work-logs/position/${positionCode}/crops`, {
      timeout: 10000
    });
    
    // 檢查返回數據格式
    if (!Array.isArray(response.data)) {
      console.warn(`位置 ${positionCode} 返回了非數組數據:`, response.data);
      return [];
    }
    
    // 存儲到快取
    apiCache.set(cacheKey, response.data, 3600000); // 快取1小時
    
    return response.data;
  } catch (error) {
    console.error(`獲取位置 ${positionCode} 的作物列表失敗:`, error);
    return [];
  }
};

// 匯出工作日誌
export const exportWorkLogs = async (filters, format = 'csv') => {
  const queryParams = new URLSearchParams({
    ...filters,
    format
  }).toString();
  
  // 使用 window.open 直接下載檔案
  window.open(`${api.defaults.baseURL}/work-logs/export?${queryParams}`);
};

// 獲取工作統計資訊
export const getWorkStats = async (startDate, endDate) => {
  // 生成快取鍵
  const cacheKey = `workStats:${startDate || 'all'}:${endDate || 'all'}`;
  
  // 檢查快取
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    console.log('使用快取的工作統計數據');
    return cachedData;
  }
  
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    // 直接發送請求，不使用節流
    const response = await api.get('/work-logs/stats', { 
      params,
      timeout: 10000 // 增加超時時間
    });
    
// 儲存到快取
apiCache.set(cacheKey, response.data, 120000); // 快取2分鐘
    
return response.data;
} catch (error) {
console.warn('工作統計請求失敗，返回默認值:', error.message);
return {
  totalWorkLogs: 0,
  totalHours: 0,
  avgHoursPerDay: 0,
  topCategories: []
};
}
};

// ----- 公告 API -----
export const fetchNotices = async () => {
// 檢查快取
const cachedData = apiCache.get('notices');
if (cachedData) {
return cachedData;
}

const response = await api.get('/notices');

// 儲存到快取
apiCache.set('notices', response.data, 300000); // 快取5分鐘

return response.data;
};

// 標記公告為已讀
export const markNoticeAsRead = async (noticeId) => {
const response = await api.post(`/notices/${noticeId}/read`);

// 標記為已讀後清除公告相關快取
apiCache.clear('notices');
apiCache.clear('unreadNoticeCount');

return response.data;
};

// 獲取未讀公告數量
export const getUnreadNoticeCount = async () => {
// 檢查快取
const cachedData = apiCache.get('unreadNoticeCount');
if (cachedData) {
console.log('使用快取的未讀公告數量');
return cachedData;
}

try {
const response = await api.get('/notices/unread-count');

// 儲存到快取
apiCache.set('unreadNoticeCount', response.data, 180000); // 快取3分鐘

return response.data;
} catch (error) {
console.error('獲取未讀公告數量失敗:', error);
return { unreadCount: 0 };
}
};

export const createNotice = async (noticeData) => {
const response = await api.post('/notices', noticeData);

// 清除公告相關快取
apiCache.clear('notices');
apiCache.clear('unreadNoticeCount');

return response.data;
};

export const updateNotice = async (noticeId, noticeData) => {
const response = await api.put(`/notices/${noticeId}`, noticeData);

// 清除公告相關快取
apiCache.clear('notices');
apiCache.clear('unreadNoticeCount');

return response.data;
};

export const deleteNotice = async (noticeId) => {
const response = await api.delete(`/notices/${noticeId}`);

// 清除公告相關快取
apiCache.clear('notices');
apiCache.clear('unreadNoticeCount');

return response.data;
};

// ----- 使用者 API -----
export const fetchUsers = async () => {
// 檢查快取
const cachedData = apiCache.get('users');
if (cachedData) {
return cachedData;
}

const response = await api.get('/users');

// 儲存到快取
apiCache.set('users', response.data, 300000); // 快取5分鐘

return response.data;
};

export const createUser = async (userData) => {
const response = await api.post('/users', userData);

// 清除使用者快取
apiCache.clear('users');

return response.data;
};

export const updateUser = async (userId, userData) => {
const response = await api.put(`/users/${userId}`, userData);

// 清除使用者快取
apiCache.clear('users');

return response.data;
};

export const deleteUser = async (userId) => {
const response = await api.delete(`/users/${userId}`);

// 清除使用者快取
apiCache.clear('users');

return response.data;
};

export const checkUsernameAvailability = async (username) => {
// 使用節流控制請求頻率
try {
const response = await throttle(
  `checkUsername:${username}`,
  () => api.get(`/users/check-username/${username}`),
  2000 // 增加延遲
);
return response.data;
} catch (error) {
if (error.message === 'Request throttled') {
  console.warn('使用者名稱檢查請求過於頻繁');
  return { available: true }; // 默認值
}
throw error;
}
};

// ----- Google 帳號綁定 API -----
export const bindGoogleAccount = async (googleId, email) => {
try {
console.log('正在發送 Google 帳號綁定請求:', {
  endpoint: '/users/bind-google',
  data: { googleId: '(已隱藏)', email: '(已隱藏)' }
});

const response = await api.post('/users/bind-google', { 
  googleId, 
  email 
});

console.log('Google 帳號綁定成功:', response.data);
return response.data;
} catch (error) {
console.error('Google 帳號綁定 API 失敗:', error);

// 詳細日誌以幫助診斷問題
if (error.response) {
  console.error('服務器響應:', {
    status: error.response.status,
    data: error.response.data
  });
} else if (error.request) {
  console.error('無服務器響應:', error.request);
} else {
  console.error('請求設置出錯:', error.message);
}

throw error;
}
};

export const unbindGoogleAccount = async () => {
try {
console.log('正在發送 Google 帳號解除綁定請求');

const response = await api.post('/users/unbind-google');

console.log('Google 帳號解除綁定成功:', response.data);
return response.data;
} catch (error) {
console.error('Google 帳號解除綁定 API 失敗:', error);

// 詳細日誌以幫助診斷問題
if (error.response) {
  console.error('服務器響應:', {
    status: error.response.status,
    data: error.response.data
  });
} else if (error.request) {
  console.error('無服務器響應:', error.request);
} else {
  console.error('請求設置出錯:', error.message);
}

throw error;
}
};

// ----- 資料 API -----
export const fetchLocations = async () => {
// 檢查快取
const cachedData = apiCache.get('locations');
if (cachedData) {
console.log('使用快取的位置數據');
return cachedData;
}

try {
// 直接發送請求，不使用節流
const response = await api.get('/data/locations', {
  timeout: 10000 // 增加超時時間
});

// 儲存到快取 (長時間快取)
apiCache.set('locations', response.data, 3600000); // 快取1小時

return response.data;
} catch (error) {
console.warn('位置請求失敗，返回空陣列:', error.message);
return [];
}
};

export const fetchWorkCategories = async () => {
// 檢查快取
const cachedData = apiCache.get('workCategories');
if (cachedData) {
console.log('使用快取的工作類別數據');
return cachedData;
}

try {
// 直接發送請求，不使用節流
const response = await api.get('/data/work-categories', {
  timeout: 10000 // 增加超時時間
});

// 儲存到快取 (長時間快取)
apiCache.set('workCategories', response.data, 3600000); // 快取1小時

return response.data;
} catch (error) {
console.warn('工作類別請求失敗，返回空陣列:', error.message);
return [];
}
};

export const fetchProducts = async () => {
// 檢查快取
const cachedData = apiCache.get('products');
if (cachedData) {
console.log('使用快取的產品數據');
return cachedData;
}

try {
// 直接發送請求，不使用節流
const response = await api.get('/data/products', {
  timeout: 10000 // 增加超時時間
});

// 儲存到快取 (長時間快取)
apiCache.set('products', response.data, 3600000); // 快取1小時

return response.data;
} catch (error) {
console.warn('產品請求失敗，返回空陣列:', error.message);
return [];
}
};

// 位置資料獲取函數 - 優化重試機制
export const fetchLocationsByArea = async () => {
// 檢查快取
const cachedData = apiCache.get('locationsByArea');
if (cachedData) {
console.log('使用快取的按區域分組位置數據');
return cachedData;
}

// 增加重試機制
let retryCount = 0;
const maxRetries = 3;

while (retryCount <= maxRetries) {
try {
  console.log(`嘗試獲取位置資料 (${retryCount}/${maxRetries})`);
  
  // 直接發送請求，避免節流
  const response = await api.get('/data/locations-by-area', {
    timeout: 10000 + (retryCount * 2000) // 隨著重試增加超時時間
  });
  
  // 儲存到快取
  apiCache.set('locationsByArea', response.data, 3600000); // 快取1小時
  
  console.log('成功獲取位置資料');
  return response.data;
} catch (error) {
  retryCount++;
  console.error(`獲取位置資料失敗 (${retryCount}/${maxRetries}):`, error.message);
  
  // 如果還有重試機會，等待後重試
  if (retryCount <= maxRetries) {
    const delay = 2000 * retryCount; // 隨著重試次數增加延遲
    console.log(`等待 ${delay}ms 後重試...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  } else {
    // 所有重試都失敗，返回默認值
    console.warn('多次重試後仍無法獲取位置資料，返回默認值');
    const defaultData = [
      { areaName: 'A區', locations: [] },
      { areaName: 'B區', locations: [] },
      { areaName: 'C區', locations: [] }
    ];
    
    // 短期快取默認值，以便稍後可以重試
    apiCache.set('locationsByArea', defaultData, 30000); // 僅快取30秒
    
    return defaultData;
  }
}
}

// 確保有返回值
return [
{ areaName: 'A區', locations: [] },
{ areaName: 'B區', locations: [] },
{ areaName: 'C區', locations: [] }
];
};

// ----- 儀表板 API -----
export const fetchDashboardStats = async () => {
// 檢查快取
const cachedData = apiCache.get('dashboardStats');
if (cachedData) {
console.log('使用快取的儀表板統計數據');
return cachedData;
}

try {
// 直接發送請求，不使用節流
const response = await api.get('/stats/dashboard', {
  timeout: 10000 // 增加超時時間
});

// 儲存到快取
apiCache.set('dashboardStats', response.data, 60000); // 快取1分鐘

return response.data;
} catch (error) {
console.warn('儀表板統計請求失敗，返回默認值:', error.message);
return {
  totalUsers: 0,
  pendingWorkLogs: 0,
  unreadNotices: 0
};
}
};

// 節流 Map 和函數
const throttleMap = new Map();

const throttle = (key, fn, delay = 3000) => {
  const now = Date.now();
  
  if (throttleMap.has(key)) {
    const { timestamp } = throttleMap.get(key);
    if (now - timestamp < delay) {
      console.log(`請求 ${key} 被節流，上次請求只有 ${now - timestamp}ms 前`);
      return Promise.reject(new Error('Request throttled'));
    }
  }
  
  throttleMap.set(key, { timestamp: now });
  
  return fn().finally(() => {
    // 請求完成後延遲清除
    setTimeout(() => {
      throttleMap.delete(key);
    }, delay);
  });
};

export { apiCache, throttle };
export default api;