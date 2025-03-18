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

// 創建 axios 實例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3002/api',
  withCredentials: true,
  timeout: 15000  // 增加超時時間到15秒
});

// 節流函數 - 修改為更寬容的版本
const throttleMap = new Map();
const throttle = (key, fn, delay = 3000) => {
  const now = Date.now();
  
  // 檢查是否存在並且在冷卻期
  if (throttleMap.has(key)) {
    const { timestamp, rejectCount } = throttleMap.get(key);
    const timeSince = now - timestamp;
    
    // 如果距離上次請求超過3秒，允許通過
    if (timeSince > 3000) {
      console.log(`${key} 請求間隔已超過3秒，允許通過`);
    } 
    // 否則記錄重複請求但仍然允許通過
    else {
      console.log(`${key} 請求間隔較短 (${timeSince}ms)，但仍允許`);
      throttleMap.set(key, {
        timestamp,
        rejectCount: (rejectCount || 0) + 1
      });
    }
  }

  // 更新節流映射
  throttleMap.set(key, {
    timestamp: now,
    rejectCount: 0
  });
  
  return fn();
};

// 標記公告為已讀
export const markNoticeAsRead = async (noticeId) => {
  const response = await api.post(`/notices/${noticeId}/read`);
  return response.data;
};



export const fetchLocationCrops = async (positionCode) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/locations/${positionCode}/crops`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    return []; // 返回空數組以避免錯誤
  }
};


export const testAuth = async () => {
  try {
    const response = await api.get('/auth/test');
    console.log('認證狀態:', response.data);
    return response.data;
  } catch (err) {
    console.error('認證測試失敗:', err);
    // 如果是403錯誤，可能需要重新登入
    if (err.response && err.response.status === 403) {
      console.warn('權限被拒絕，將重新登入');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 可以選擇是否直接導向登入頁面
      // window.location.href = '/login';
    }
    throw err;
  }
};



// 獲取未讀公告數量
export const getUnreadNoticeCount = async () => {
  const response = await api.get('/notices/unread-count');
  return response.data;
};


// 攔截器：為每個請求添加 Token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 對於文件上傳請求，不設置 Content-Type，讓瀏覽器自動設置
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    console.log('發送API請求:', config.url);
    return config;
  },
  error => {
    console.error('API請求錯誤:', error);
    return Promise.reject(error);
  }
);

// 響應攔截器：統一處理錯誤
api.interceptors.response.use(
  response => {
    console.log('API響應成功:', response.config.url);
    return response;
  },
  error => {
    // 詳細記錄錯誤信息
    console.error('API響應錯誤:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    // 處理特定錯誤類型
    if (error.response && error.response.status === 401) {
      // 處理未授權錯誤，可能是token過期
      console.warn('授權已過期或無效，將重定向到登入頁面');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('認證已過期，請重新登入'));
    }
    
    return Promise.reject(error);
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

    // 直接使用原始數據並添加適當的默認值
    // 不進行欄位重命名，避免在轉換過程中丟失數據
    const payload = {
      ...workLogData,
      // 確保必要欄位總是有值
      location: workLogData.location || workLogData.position_name || '',
      crop: workLogData.crop || workLogData.work_category_name || '',
      start_time: workLogData.startTime || workLogData.start_time || '',
      end_time: workLogData.endTime || workLogData.end_time || '',
      harvest_quantity: workLogData.harvestQuantity || workLogData.harvest_quantity || 0,
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

export const searchWorkLogs = async (filters) => {
  // 生成快取鍵
  const cacheKey = `workLogs:${JSON.stringify(filters)}`;
  
  // 檢查快取
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    console.log('使用快取的工作日誌數據');
    return cachedData;
  }
  
  try {
    // 使用節流避免頻繁請求
    const response = await throttle(
      `searchWorkLogs:${JSON.stringify(filters)}`,
      () => api.get('/work-logs/search', { params: filters }),
      5000  // 增加節流時間
    );
    
    // 儲存到快取
    apiCache.set(cacheKey, response.data, 60000); // 快取1分鐘
    
    return response.data;
  } catch (error) {
    // 如果是節流錯誤，顯示友好提示
    if (error.message === 'Request throttled') {
      console.warn('請求過於頻繁，請稍後再試');
      return [];
    }
    throw error;
  }
};

export const reviewWorkLog = async (workLogId, status) => {
  const response = await api.patch(`/work-logs/${workLogId}/review`, { status });
  
  // 審核後清除相關快取
  apiCache.clear('workLogs');
  apiCache.clear('workStats');
  
  return response.data;
};

// 修改後的 getTodayHour 函數，增加重試機制並優化錯誤處理
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
      
      // 使用增加的超時時間直接發送請求，避開節流
      const response = await api.get('/work-logs/today-hour', {
        timeout: 10000 + (retryCount * 2000) // 隨著重試增加超時時間
      });
      
      const data = response.data;
      
      // 檢查數據格式
      if (!data || typeof data.total_hours === 'undefined') {
        throw new Error('回應數據格式不正確');
      }
      
      // 增加快取時間
      apiCache.set('todayHour', data, 180000); // 快取3分鐘
      
      console.log('成功獲取今日工時:', data);
      return data;
    } catch (error) {
      retryCount++;
      console.error(`獲取今日工時失敗 (${retryCount}/${maxRetries}):`, error.message);
      
      // 如果還有重試機會，等待後重試
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

// 新增的健康檢查API，可用於檢查伺服器連線狀態
export const checkServerHealth = async () => {
  try {
    const response = await api.get('/health-check', { timeout: 5000 });
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