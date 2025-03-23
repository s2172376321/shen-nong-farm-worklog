// 位置：frontend/src/utils/api.js
// frontend/src/utils/api.js 的開頭部分修改

import axios from 'axios';

console.log('API 模組初始化', {
  baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3002/api',
  env: process.env.NODE_ENV
});

// 快取存儲
export const apiCache = {
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
  timeout: 15000  // 增加超時時間到15秒
});

// 節流 Map
const throttleMap = new Map();

// 節流函數
export const throttle = (key, fn, delay = 3000) => {
  const now = Date.now();
  
  if (throttleMap.has(key)) {
    const { timestamp } = throttleMap.get(key);
    if (now - timestamp < delay) {
      console.log(`[API] 請求 ${key} 被節流，上次請求只有 ${now - timestamp}ms 前`);
      return Promise.reject(new Error('Request throttled'));
    }
  }
  
  throttleMap.set(key, { timestamp: now });
  
  return fn().finally(() => {
    // 請求完成後不要立即刪除，而是延遲一段時間
    setTimeout(() => {
      throttleMap.delete(key);
    }, delay);
  });
};





// 標記公告為已讀
export const markNoticeAsRead = async (noticeId) => {
  const response = await api.post(`/notices/${noticeId}/read`);
  return response.data;
};



// 修改 fetchLocationCrops 函數，增強錯誤處理
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
    
    // 返回空數组
    return [];
  }
}


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

// 在攔截器配置前添加
console.log('Token存在:', localStorage.getItem('token') ? '是' : '否');


// 攔截// 攔截器：為每個請求添加 Token
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
    
    console.log(`[API] 發送請求: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    console.error('[API] 請求配置錯誤:', error);
    return Promise.reject(error);
  }
);



// 響應攔截器：統一處理錯誤
api.interceptors.response.use(
  response => {
    console.log(`[API] 請求成功: ${response.config.url}`);
    return response;
  },
  error => {
    // 詳細記錄錯誤信息
    console.error('[API] 請求失敗:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    // 處理特定錯誤類型
    if (error.response && error.response.status === 401) {
      // 處理未授權錯誤，可能是token過期
      console.warn('[API] 授權已過期或無效，將重定向到登入頁面');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // 避免循環重定向
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(new Error('認證已過期，請重新登入'));
    }
    
    return Promise.reject(error);
  }
);



// ----- WebSocket API -----
// WebSocket 连接类
export class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
  }

  // 连接到 WebSocket 伺服器
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket 已連接或正在連接中');
      return;
    }

    try {
      console.log('嘗試連接 WebSocket...');
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3002/ws';
      const token = localStorage.getItem('token');
      
      // 修改：將 token 添加到 WebSocket URL 的查詢參數中
      const wsUrlWithToken = `${wsUrl}?token=${token}`;
      this.socket = new WebSocket(wsUrlWithToken);

      this.socket.onopen = this.onOpen.bind(this);
      this.socket.onmessage = this.onMessage.bind(this);
      this.socket.onerror = this.onError.bind(this);
      this.socket.onclose = this.onClose.bind(this);
    } catch (error) {
      console.error('WebSocket 連接錯誤:', error);
      this.attemptReconnect();
    }
  }

  
  // 连接成功回调
  onOpen() {
    console.log('WebSocket 连接成功');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.emit('connected');
    
    // 发送初始ping消息以测试连接
    this.send('ping', { timestamp: Date.now() });
  }

  // 收到消息回调
  onMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('收到 WebSocket 消息:', data);
      this.emit(data.type, data.data);
    } catch (error) {
      console.error('解析 WebSocket 消息错误:', error);
    }
  }

  // 错误回调
  onError(error) {
    console.error('WebSocket 错误:', error);
    this.emit('error', error);
  }

  // 连接关闭回调
  onClose(event) {
    console.log('WebSocket 连接关闭:', event);
    this.isConnected = false;
    this.emit('disconnected');
    this.attemptReconnect();
  }

  // 尝试重新连接
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('重连次数已达上限，停止重连');
      return;
    }

    this.reconnectAttempts++;
    console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 3000); // 3秒后重连
  }

  // 发送消息
  send(type, data) {
    if (!this.isConnected) {
      console.warn('WebSocket 未连接，无法发送消息');
      return false;
    }

    try {
      const message = JSON.stringify({ type, data });
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('发送 WebSocket 消息错误:', error);
      return false;
    }
  }

  // 关闭连接
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
    clearTimeout(this.reconnectTimeout);
  }

  // 注册事件监听
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // 发送事件通知
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`执行 ${event} 监听器错误:`, error);
        }
      });
    }
  }
}

// 創建 WebSocket 服務實例
export const websocket = new WebSocketService();

// ----- 認證相關 API -----
// 一般登入
export const loginUser = async (username, password) => {
  try {
    console.log('[API] 嘗試登入用戶:', username);
    const response = await api.post('/auth/login', { username, password });
    console.log('[API] 登入成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('[API] 登入失敗:', error);
    throw error;
  }
};

export const googleLogin = async (credential) => {
  try {
    console.log('[API] 調用 googleLogin API 函數', { 
      credentialLength: credential?.length,
      credentialSubstr: credential ? `${credential.substring(0, 10)}...` : 'missing'
    });
    
    if (!credential) {
      console.error('[API] googleLogin: 缺少必要的 Google 憑證');
      throw new Error('缺少 Google 憑證');
    }
    
    // 嘗試繞過 axios 實例，直接使用瀏覽器的 fetch API 
    console.log('[API] 使用 fetch 發送 Google 登入請求');
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';
    const response = await fetch(`${baseUrl}/auth/google-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: credential })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[API] Google 登入失敗', {
        status: response.status,
        data: errorData
      });
      throw new Error(errorData.message || '伺服器拒絕 Google 登入請求');
    }
    
    const data = await response.json();
    console.log('[API] Google 登入成功', {
      hasToken: !!data.token,
      hasUser: !!data.user
    });
    
    if (!data.token || !data.user) {
      console.error('[API] 伺服器響應缺少必要資訊', data);
      throw new Error('伺服器響應格式不正確');
    }
    
    return data;
  } catch (error) {
    console.error('[API] Google 登入失敗:', error);
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
    console.log('提交工作日誌數據:', workLogData);
    
    // 確保通過一致的鍵名傳遞數據
    const standardizedData = {
      // 使用工作日誌的標準欄位名稱
      position_code: workLogData.position_code || '',
      position_name: workLogData.position_name || '',
      work_category_code: workLogData.work_category_code || '',
      work_category_name: workLogData.work_category_name || '',
      start_time: workLogData.start_time || workLogData.startTime || '',
      end_time: workLogData.end_time || workLogData.endTime || '',
      details: workLogData.details || '',
      crop: workLogData.crop || '',
      harvest_quantity: workLogData.harvest_quantity || workLogData.harvestQuantity || 0,
      product_id: workLogData.product_id || '',
      product_name: workLogData.product_name || '',
      product_quantity: workLogData.product_quantity || 0
    };
    
    const response = await api.post('/work-logs', standardizedData);
    return response.data;
  } catch (error) {
    console.error('提交工作日誌錯誤:', error);
    
    // 提供有用的錯誤信息
    let errorMessage = '提交工作日誌失敗';
    
    if (error.response) {
      errorMessage = error.response.data?.message || errorMessage;
    }
    
    throw new Error(errorMessage);
  }
};



// CSV 上傳工作日誌
export const uploadCSV = async (csvFile) => {
  try {
    // 創建 FormData 物件
    const formData = new FormData();
    formData.append('csvFile', csvFile);
    
    const response = await api.post('/work-logs/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('上傳 CSV 工作日誌失敗:', error);
    throw error;
  }
};

export const searchWorkLogs = async (filters) => {
  console.log('搜尋工作日誌前 - Token存在:', localStorage.getItem('token') ? '是' : '否');

  

    // 修正參數名稱錯誤
    const correctedFilters = { ...filters };
  
    // 檢查並修正日期參數名稱
    if ('_ndDate' in correctedFilters) {
      correctedFilters.endDate = correctedFilters._ndDate;
      delete correctedFilters._ndDate;
      console.log('已修正參數名稱: _ndDate -> endDate');
    }
    
    if ('_tartDate' in correctedFilters) {
      correctedFilters.startDate = correctedFilters._tartDate;
      delete correctedFilters._tartDate;
      console.log('已修正參數名稱: _tartDate -> startDate');
    }
 
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
        
        const response = await api.get('/work-logs/search', { 
          params: filters,
          timeout: currentTimeout
        });
        
        console.log('工作日誌搜尋結果:', response.status, response.data?.length || 0);
        
        // 檢查響應類型和內容
        if (!response || !response.data) {
          console.warn('API 響應無效或為空');
          timeoutAttempts++;
          continue;
        }
        
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
        if (error.code === 'ECONNABORTED' && timeoutAttempts < maxTimeoutAttempts) {
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
      // 可以在這裡添加重新導向到登入頁面的邏輯
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return [];
    }
    
    // 默認返回空數組避免UI崩潰
    return [];
  } catch (error) {
    console.error('searchWorkLogs 處理發生意外錯誤:', error);
    return [];
  }
};



    
// 審核工作日誌
// 工作日誌審核函數
export const reviewWorkLog = async (workLogId, status) => {
  try {
    const response = await api.patch(`/work-logs/${workLogId}/review`, { status });
    return response.data;
  } catch (error) {
    console.error('審核工作日誌失敗:', error);
    throw error;
  }
};


// 修改後的 getTodayHour 函數，增加重試機制並優化錯誤處理
export const getTodayHour = async () => {
  try {
    const response = await api.get('/work-logs/today-hour');
    
    // 確保返回數據格式一致
    return {
      total_hours: response.data.total_hours || '0.00',
      remaining_hours: response.data.remaining_hours || '8.00',
      is_complete: !!response.data.is_complete
    };
  } catch (error) {
    console.error('獲取今日工時失敗:', error);
    
    // 返回默認值
    return {
      total_hours: '0.00',
      remaining_hours: '8.00',
      is_complete: false
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

export const createNotice = async (noticeData) => {
  // 增加錯誤檢查和日誌
  console.log('正在創建公告，數據:', noticeData);
  
  if (!noticeData) {
    console.error('公告數據為空');
    throw new Error('無法創建公告：數據為空');
  }
  
  // 檢查必填字段
  if (!noticeData.title || !noticeData.content) {
    console.error('公告數據缺少必填字段:', noticeData);
    throw new Error('公告需要標題和內容');
  }
  
  // 明確指定 Content-Type 標頭
  const response = await api.post('/notices', noticeData, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
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
export const exportWorkLogs = async (filters) => {
  try {
    // 構建查詢參數
    const queryString = new URLSearchParams(filters).toString();
    
    // 使用瀏覽器直接下載檔案
    window.location.href = `${api.defaults.baseURL}/work-logs/export?${queryString}`;
    
    return true;
  } catch (error) {
    console.error('匯出工作日誌失敗:', error);
    throw error;
  }
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


export const getApiStatus = async () => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/health-check`, {
      timeout: 5000
    });
    const data = await response.json();
    return {
      status: 'online',
      message: data?.message || '伺服器連線正常',
      serverTime: data?.serverTime
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