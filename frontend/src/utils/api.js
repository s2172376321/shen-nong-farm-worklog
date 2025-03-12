// 位置：frontend/src/utils/api.js
import axios from 'axios';

// 快取存儲
const apiCache = {
  data: {},
  set: function(key, value, ttl = 300000) { // 預設快取5分鐘 (300000毫秒)
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

// 創建 axios 實例 - 修正為使用 3002 端口
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3002/api',
  withCredentials: true,
  timeout: 15000,  // 增加超時時間到15秒
  headers: {
    'Content-Type': 'application/json'
  }
});

// 節流函數 - 用於限制請求頻率
const throttleMap = new Map();
const throttle = (key, fn, initialDelay = 1000) => {
  const now = Date.now();
  
  // 檢查是否存在並且在冷卻期內
  if (throttleMap.has(key)) {
    const { timestamp, rejectCount, delay } = throttleMap.get(key);
    
    // 如果在冷卻期內，增加拒絕計數並使用指數退避
    if (now - timestamp < delay) {
      // 計算下一次退避延遲（指數增長但有上限）
      const nextDelay = Math.min(delay * 1.5, 30000); // 最大30秒
      const nextRejectCount = rejectCount + 1;
      
      throttleMap.set(key, {
        timestamp,
        rejectCount: nextRejectCount,
        delay: nextDelay
      });
      
      console.warn(`請求 ${key} 被節流，當前延遲 ${delay}ms，拒絕次數 ${nextRejectCount}`);
      return Promise.reject(new Error('Request throttled'));
    }
  }

  // 更新節流映射
  throttleMap.set(key, {
    timestamp: now,
    rejectCount: 0,
    delay: initialDelay
  });
  
  // 設置延遲清除
  const timeoutId = setTimeout(() => {
    // 只有在對象仍然存在並且時間戳與當前匹配時才清除
    const current = throttleMap.get(key);
    if (current && current.timestamp === now) {
      throttleMap.delete(key);
    }
  }, initialDelay);
  
  // 執行函數並處理結果
  return fn().finally(() => {
    // 成功時可以提前清除節流
    clearTimeout(timeoutId);
    
    // 檢查是否仍是當前請求
    const current = throttleMap.get(key);
    if (current && current.timestamp === now) {
      // 保留5秒冷卻期，避免極短時間內的重複請求
      setTimeout(() => {
        throttleMap.delete(key);
      }, 5000);
    }
  });
};

// 請求攔截器 - 增加更多日誌
api.interceptors.request.use(
  config => {
    // 為每個請求添加 Token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 增加請求重試功能
    config.retry = 3; // 重試次數
    config.retryDelay = 1000; // 重試間隔
    
    // 記錄請求細節（不包含敏感資訊）
    const logInfo = {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      timestamp: new Date().toISOString()
    };
    console.log(`送出請求: ${config.method.toUpperCase()} ${config.url}`, logInfo);
    
    return config;
  },
  error => {
    console.error('請求錯誤:', error);
    return Promise.reject(error);
  }
);


// 響應攔截器 - 增強錯誤處理
api.interceptors.response.use(
  response => {
    // 記錄成功響應（僅日誌資訊，不包含完整資料）
    console.log(`請求成功: ${response.config.url}`, {
      status: response.status,
      statusText: response.statusText,
      dataSize: JSON.stringify(response.data).length,
      timestamp: new Date().toISOString()
    });
    return response;
  },
  async error => {
    const { config, response } = error;
    
    // 如果是請求超時或網絡錯誤，則嘗試重試
    if (!response && config && config.retry > 0) {
      console.log(`嘗試重新連接到 ${config.url}，剩餘重試次數: ${config.retry}`);
      
      // 等待一段時間再重試
      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      
      // 減少重試次數並重新發送請求
      config.retry -= 1;
      return api(config);
    }
    
    // 如果是 401 未授權，可能是 token 過期，嘗試刷新 token
    if (response && response.status === 401) {
      // 這裡可以添加 token 刷新邏輯
      console.log('認證失敗，需要重新登入');
      
      // 清除本地存儲的認證信息
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // 重定向到登入頁面
      window.location.href = '/login';
    }
    
    // 表單驗證錯誤 - 更清晰的錯誤處理
    if (response && response.status === 400) {
      console.warn('表單驗證錯誤:', response.data);
      const errorMessage = response.data?.message || '請檢查表單欄位';
      error.userMessage = errorMessage;
      // 增加額外屬性以便UI顯示詳細錯誤
      error.validationErrors = response.data?.errors || {};
    } else {
      // 其他錯誤 - 提供更友好的錯誤訊息
      const errorMessage = response?.data?.message || 
                          error.message || 
                          '發生未知錯誤';
      error.userMessage = errorMessage;
    }
    
    // 記錄錯誤詳情
    console.error('API 請求失敗:', {
      url: config?.url,
      method: config?.method,
      status: response?.status,
      statusText: response?.statusText,
      message: error.userMessage,
      timestamp: new Date().toISOString()
    });
    
    return Promise.reject(error);
  }
);

// ----- WebSocket API -----
// WebSocket 連接類 - 更新WebSocket URL以匹配伺服器
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
      // 修改為使用3002端口
      this.socket = new WebSocket('ws://localhost:3002/ws');

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

// 位置：frontend/src/utils/api.js 中的 googleLogin 方法
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

// ----- 工作日誌 API ----- (修改工作日誌提交格式)
export const createWorkLog = async (workLogData) => {
  try {
    // 檢查必要欄位
    const requiredFields = ['location_code', 'position_code', 'work_category_code', 'startTime', 'endTime'];
    const missingFields = requiredFields.filter(field => !workLogData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`請填寫所有必要欄位: ${missingFields.join(', ')}`);
    }
    
    // 標準化提交數據格式
    const formattedData = {
      location_code: workLogData.location_code,
      position_code: workLogData.position_code,
      position_name: workLogData.position_name || '',
      work_category_code: workLogData.work_category_code,
      work_category_name: workLogData.work_category_name || '',
      start_time: workLogData.startTime,  // 保持 startTime 格式
      end_time: workLogData.endTime,      // 保持 endTime 格式
      details: workLogData.details || '',
      harvest_quantity: workLogData.harvestQuantity || 0,
      product_id: workLogData.product_id || null,
      product_name: workLogData.product_name || null,
      product_quantity: workLogData.product_quantity || 0
    };
    
    console.log('送出工作日誌資料:', formattedData);
    
    const response = await api.post('/work-logs', formattedData);
    
    // 創建日誌後清除相關快取
    apiCache.clear('workLogs');
    apiCache.clear('workStats');
    apiCache.clear('todayHour');
    
    console.log('工作日誌創建成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('創建工作日誌失敗:', error);
    // 重新拋出錯誤，保持原始錯誤訊息
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
    apiCache.clear('workStats');
    apiCache.clear('todayHour');
    
    console.log('CSV 上傳成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('CSV 上傳失敗:', error);
    
    // 詳細錯誤日誌
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

// 修改 searchWorkLogs 函數
export const searchWorkLogs = async (filters) => {
  // 生成快取鍵
  const cacheKey = `workLogs:${JSON.stringify(filters)}`;
  
  // 檢查快取
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    console.log('使用快取的工作日誌數據');
    return cachedData;
  }
  
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount <= maxRetries) {
    try {
      // 使用節流避免頻繁請求
      const response = await throttle(
        `searchWorkLogs:${JSON.stringify(filters)}`,
        () => api.get('/work-logs/search', { params: filters }),
        2000 + (retryCount * 1000) // 隨著重試次數增加基本延遲
      );
      
      // 儲存到快取
      apiCache.set(cacheKey, response.data, 60000); // 快取1分鐘
      
      return response.data;
    } catch (error) {
      retryCount++;
      
      // 如果是節流錯誤或特定HTTP錯誤，等待後重試
      if (error.message === 'Request throttled' || 
          (error.response && (error.response.status === 429 || error.response.status === 503))) {
        
        if (retryCount <= maxRetries) {
          const delay = 2000 * Math.pow(2, retryCount - 1); // 指數退避
          console.warn(`工作日誌查詢失敗，${delay}ms後重試(${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        console.warn('查詢工作日誌達到最大重試次數，返回空數組');
        return [];
      }
      
      // 其他錯誤直接抛出
      throw error;
    }
  }
  
  // 這裡不應該到達，但為了安全返回空數組
  return [];
};

export const reviewWorkLog = async (workLogId, status) => {
  const response = await api.patch(`/work-logs/${workLogId}/review`, { status });
  
  // 審核後清除相關快取
  apiCache.clear('workLogs');
  apiCache.clear('workStats');
  
  return response.data;
};

// 修改 getTodayHour 函數
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
      // 限制請求頻率
      const response = await throttle(
        'getTodayHour',
        () => api.get('/work-logs/today-hour'),
        2000 * Math.pow(1.5, retryCount) // 隨著重試次數增加延遲
      );
      
      // 檢查響應數據格式
      const data = response.data;
      if (!data || typeof data.total_hours === 'undefined') {
        throw new Error('Invalid response format');
      }
      
      // 儲存到快取 - 工時數據快取時間較短
      apiCache.set('todayHour', data, 30000); // 快取30秒
      
      return data;
    } catch (error) {
      retryCount++;
      
      // 記錄詳細錯誤信息
      console.error('獲取今日工時失敗:', {
        attempt: retryCount,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // 如果是節流錯誤或特定HTTP錯誤，等待後重試
      if (error.message === 'Request throttled' || 
          error.message === 'Invalid response format' ||
          (error.response && (error.response.status === 429 || error.response.status === 503))) {
        
        if (retryCount <= maxRetries) {
          const delay = 2000 * Math.pow(2, retryCount - 1); // 指數退避
          console.warn(`獲取今日工時失敗，${delay}ms後重試(${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // 返回默認值
      console.warn('今日工時請求失敗達到最大重試次數，返回默認值');
      return {
        total_hours: "0.00",
        remaining_hours: "8.00",
        is_complete: false
      };
    }
  }
  
  // 這裡不應該到達，但為了安全返回默認值
  return {
    total_hours: "0.00",
    remaining_hours: "8.00",
    is_complete: false
  };
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

export const createNotice = async (noticeData) => {
  const response = await api.post('/notices', noticeData);
  
  // 清除公告快取
  apiCache.clear('notices');
  
  return response.data;
};

export const updateNotice = async (noticeId, noticeData) => {
  const response = await api.put(`/notices/${noticeId}`, noticeData);
  
  // 清除公告快取
  apiCache.clear('notices');
  
  return response.data;
};

export const deleteNotice = async (noticeId) => {
  const response = await api.delete(`/notices/${noticeId}`);
  
  // 清除公告快取
  apiCache.clear('notices');
  
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
      () => api.get(`/users/check-username/${username}`)
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
    // 使用節流控制請求頻率
    const response = await throttle(
      'fetchLocations',
      () => api.get('/data/locations')
    );
    
    // 檢查數據格式
    if (!Array.isArray(response.data)) {
      console.warn('位置數據格式不正確:', response.data);
      return []; // 返回空數組避免錯誤
    }
    
    // 儲存到快取 (長時間快取)
    apiCache.set('locations', response.data, 3600000); // 快取1小時
    
    return response.data;
  } catch (error) {
    // 如果是節流錯誤或429錯誤，返回空陣列
    if (error.message === 'Request throttled' || 
        (error.response && error.response.status === 429)) {
      console.warn('位置請求限制中，返回空陣列');
      return [];
    }
    throw error;
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
    // 使用節流控制請求頻率
    const response = await throttle(
      'fetchWorkCategories',
      () => api.get('/data/work-categories')
    );
    
    // 儲存到快取 (長時間快取)
    apiCache.set('workCategories', response.data, 3600000); // 快取1小時
    
    return response.data;
  } catch (error) {
    // 如果是節流錯誤或429錯誤，返回空陣列
    if (error.message === 'Request throttled' || 
        (error.response && error.response.status === 429)) {
      console.warn('工作類別請求限制中，返回空陣列');
      return [];
    }
    throw error;
  }
};

// 修改 fetchProducts 函數
export const fetchProducts = async () => {
  // 檢查快取
  const cachedData = apiCache.get('products');
  if (cachedData) {
    console.log('使用快取的產品數據');
    return cachedData;
  }
  
  let retryCount = 0;
  const maxRetries = 3;
  let lastError = null;
  
  while (retryCount <= maxRetries) {
    try {
      // 使用節流控制請求頻率 + 指數退避
      const response = await api.get('/data/products', {
        timeout: 15000 + (retryCount * 5000) // 增加更長的超時時間
      });
      
      // 驗證響應格式
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid products data format');
      }
      
      // 儲存到快取 (長時間快取)
      apiCache.set('products', response.data, 3600000); // 快取1小時
      
      return response.data;
    } catch (error) {
      lastError = error;
      retryCount++;
      
      console.warn(`產品資料請求失敗 (${retryCount}/${maxRetries}):`, error.message);
      
      if (retryCount <= maxRetries) {
        // 使用更長的延遲時間
        const delay = 3000 * Math.pow(2, retryCount - 1);
        console.log(`等待 ${delay}ms 後重試...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  // 所有重試都失敗
  console.error('多次重試後無法獲取產品資料', lastError);
  
  // 返回空數組
  return [];
};

// 修正 fetchLocationsByArea 函數
export const fetchLocationsByArea = async () => {
  // 檢查快取
  const cachedData = apiCache.get('locationsByArea');
  if (cachedData) {
    console.log('使用快取的按區域分組位置數據');
    return cachedData;
  }
  
  // 增加重試邏輯和更好的錯誤處理
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;

  while (retryCount < maxRetries) {
    try {
      console.log(`嘗試獲取位置資料 (${retryCount + 1}/${maxRetries})`);
      
      // 增加請求超時
      const response = await api.get('/data/locations-by-area', {
        timeout: 10000 + (retryCount * 5000) // 隨著重試次數增加超時時間
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format');
      }
      
      // 儲存到快取
      apiCache.set('locationsByArea', response.data, 3600000); // 1小時快取
      console.log('成功獲取位置資料，共 ' + response.data.length + ' 個區域');
      
      return response.data;
    } catch (error) {
      lastError = error;
      retryCount++;
      
      console.warn(`獲取位置資料失敗 (${retryCount}/${maxRetries}):`, 
        error.message || '未知錯誤');
      
      // 檢查錯誤類型
      const isNetworkError = !error.response || error.code === 'ECONNABORTED';
      const isServerError = error.response && error.response.status >= 500;
      const isRateLimited = error.response && error.response.status === 429;
      
      // 對不同類型的錯誤使用不同的退避策略
      let delay = 1000;
      if (isRateLimited) {
        delay = 3000 * Math.pow(2, retryCount - 1); // 較長的指數退避
      } else if (isServerError) {
        delay = 2000 * retryCount; // 線性退避
      } else if (isNetworkError) {
        delay = 1500 * retryCount; // 較短的線性退避
      }
      
      // 打印退避信息
      console.log(`等待 ${delay}ms 後進行第 ${retryCount + 1} 次重試`);
      
      // 增加等待時間
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // 所有重試都失敗了，返回默認數據
  console.error('多次重試後仍無法獲取位置資料，返回默認數據', lastError);
  
  // 使用更詳細的錯誤日誌
  const errorDetails = {
    message: lastError?.message || '未知錯誤',
    status: lastError?.response?.status,
    statusText: lastError?.response?.statusText,
    data: lastError?.response?.data,
    retries: retryCount
  };
  console.error('詳細錯誤信息:', JSON.stringify(errorDetails));
  
  // 快取默認數據，避免持續重試
  const defaultData = [
    { areaName: 'A區', locations: [] },
    { areaName: 'B區', locations: [] },
    { areaName: 'C區', locations: [] }
  ];
  
  // 使用較短的快取時間，允許稍後重試
  apiCache.set('locationsByArea', defaultData, 300000); // 5分鐘
  
  return defaultData;
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
    
    // 使用節流控制請求頻率
    const response = await throttle(
      `getWorkStats:${startDate}:${endDate}`,
      () => api.get('/work-logs/stats', { params })
    );
    
    // 儲存到快取
    apiCache.set(cacheKey, response.data, 120000); // 快取2分鐘
    
    return response.data;
  } catch (error) {
    // 如果是節流錯誤或429錯誤，返回默認值
    if (error.message === 'Request throttled' || 
        (error.response && error.response.status === 429)) {
      console.warn('工作統計請求限制中，返回默認值');
      return {
        totalWorkLogs: 0,
        totalHours: 0,
        avgHoursPerDay: 0,
        topCategories: []
      };
    }
    throw error;
  }
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
    // 使用節流控制請求頻率
    const response = await throttle(
      'fetchDashboardStats',
      () => api.get('/stats/dashboard')
    );
    
    // 儲存到快取
    apiCache.set('dashboardStats', response.data, 60000); // 快取1分鐘
    
    return response.data;
  } catch (error) {
    // 如果是節流錯誤或429錯誤，返回默認值
    if (error.message === 'Request throttled' || 
        (error.response && error.response.status === 429)) {
      console.warn('儀表板統計請求限制中，返回默認值');
      return {
        totalUsers: 0,
        pendingWorkLogs: 0,
        unreadNotices: 0
      };
    }
    throw error;
  }
};

// 新增的健康檢查API，可用於檢查伺服器連線狀態
export const checkServerHealth = async () => {
  try {
    const response = await api.get('/health-check', { timeout: 3000 });
    return {
      status: 'online',
      message: response.data?.message || '伺服器連線正常',
      serverTime: response.data?.serverTime
    };
  } catch (error) {
    return {
      status: 'offline',
      message: '無法連線到伺服器',
      error: error.message
    };
  }
};

export default api;