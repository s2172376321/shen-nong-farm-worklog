// 位置：frontend/src/utils/api.js
import axios from 'axios';

// 快取存儲
const apiCache = {
  data: {},
  set: function(key, value, ttl = 30000) {
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
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004';
const AUTH_URL = process.env.REACT_APP_AUTH_URL || 'http://localhost:5004';
console.log('Initializing API with base URL:', BASE_URL);
console.log('Initializing Auth with base URL:', AUTH_URL);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const authApi = axios.create({
  baseURL: AUTH_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// 請求攔截器
const setupInterceptors = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      // 添加時間戳防止快取
      if (config.method === 'get') {
        config.params = {
          ...config.params,
          _t: Date.now()
        };
      }
  
      // 從 localStorage 獲取 token
      const token = localStorage.getItem('token');
      console.log('Current token:', token);
  
      // 如果有 token，添加到請求頭
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Adding auth header:', config.headers.Authorization);
      } else {
        console.log('No token found in localStorage');
      }
  
      // 根據請求類型設置正確的 Content-Type
      if (config.data instanceof FormData) {
        config.headers['Content-Type'] = 'multipart/form-data';
      } else {
        config.headers['Content-Type'] = 'application/json';
      }
  
      // 確保每個請求都帶上 credentials
      config.withCredentials = true;
  
      // 添加詳細的請求日誌
      console.log('API Request:', {
        url: config.url,
        method: config.method,
        baseURL: config.baseURL,
        headers: config.headers,
        params: config.params,
        data: config.data,
        withCredentials: config.withCredentials,
        timestamp: new Date().toISOString()
      });
  
      return config;
    },
    (error) => {
      console.error('Request error:', error);
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response) => {
      const fullUrl = `${response.config.baseURL}${response.config.url}`;
      console.log('Response success:', {
        fullUrl,
        url: response.config.url,
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString()
      });
      return response;
    },
    (error) => {
      const fullUrl = error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown';
      console.error('Response error:', {
        fullUrl,
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
        baseURL: error.config?.baseURL,
        timestamp: new Date().toISOString()
      });
  
      // 如果是認證錯誤，清除認證信息並重新登入
      if (error.response?.status === 401) {
        console.log('認證失敗，重新登入...');
        forceReauthenticate();
      } else if (error.response?.status === 403) {
        console.log('權限不足，重新登入...');
      }
  
      return Promise.reject(error);
    }
  );
};

// 設置攔截器
setupInterceptors(api);
setupInterceptors(authApi);

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
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('未找到認證令牌，無法建立 WebSocket 連接');
        return;
      }

      const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:5003/ws'}?token=${token}`;
      console.log('WebSocket URL:', wsUrl);
      
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
  let retryCount = 0;
  const maxRetries = 3;
  const retryDelay = 1000; // 1 秒

  const attemptLogin = async () => {
    try {
      // 驗證參數
      if (!username || !password) {
        throw new Error('請填寫使用者名稱和密碼');
      }

      // 驗證使用者名稱格式 (4-20位英文字母和數字)
      const usernameRegex = /^[a-zA-Z0-9]{4,20}$/;
      if (!usernameRegex.test(username)) {
        throw new Error('使用者名稱必須是4-20位英文字母和數字');
      }
      
      // 驗證密碼長度 (至少8個字元)
      if (password.length < 8) {
        throw new Error('密碼必須至少8個字元');
      }

      console.log('嘗試登入用戶:', {
        username,
        hasPassword: !!password,
        timestamp: new Date().toISOString(),
        apiUrl: api.defaults.baseURL,
        retryCount
      });
      
      // 確保請求體格式正確
      const requestBody = {
        username: username.trim(),
        password: password
      };

      // 添加請求配置
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000 + (retryCount * 2000) // 隨重試次數增加超時時間
      };

      // 發送請求前記錄
      console.log('發送登入請求:', {
        url: '/auth/login',
        method: 'POST',
        body: { ...requestBody, password: '[已隱藏]' },
        timestamp: new Date().toISOString(),
        retryCount
      });

      const response = await api.post('/auth/login', requestBody, config);
      
      // 檢查回應格式
      if (!response.data || !response.data.token) {
        throw new Error('伺服器回應格式錯誤');
      }
      
      // 記錄成功回應
      console.log('登入成功:', {
        status: response.status,
        hasToken: !!response.data.token,
        timestamp: new Date().toISOString()
      });

      // 保存 token 到 localStorage
      localStorage.setItem('token', response.data.token);
      console.log('Token saved to localStorage');
      
      return response.data;
    } catch (error) {
      // 詳細記錄錯誤
      console.error('登入失敗:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        request: error.request ? '請求已發送' : '請求未發送',
        timestamp: new Date().toISOString(),
        retryCount
      });

      // 如果是網路錯誤且還有重試機會，則重試
      if (!error.response && retryCount < maxRetries) {
        retryCount++;
        console.log(`等待 ${retryDelay}ms 後進行第 ${retryCount} 次重試...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptLogin();
      }
      
      // 如果是自定義錯誤訊息，直接拋出
      if (error.message && (
        error.message.includes('使用者名稱必須是') || 
        error.message.includes('密碼必須至少') ||
        error.message.includes('請填寫使用者名稱和密碼')
      )) {
        throw error;
      }
      
      // 處理 API 錯誤回應
      if (error.response) {
        // 如果伺服器返回了錯誤訊息，使用伺服器的錯誤訊息
        if (error.response.data && error.response.data.message) {
          throw new Error(error.response.data.message);
        }
        
        // 根據狀態碼提供預設錯誤訊息
        switch (error.response.status) {
          case 400:
            // 檢查是否有更詳細的錯誤訊息
            if (error.response.data && error.response.data.error) {
              throw new Error(`請求格式錯誤: ${error.response.data.error}`);
            } else if (error.response.data && error.response.data.details) {
              throw new Error(`請求格式錯誤: ${error.response.data.details}`);
            } else {
              throw new Error('請填寫正確的使用者名稱和密碼');
            }
          case 401:
            throw new Error('使用者名稱或密碼錯誤');
          case 403:
            throw new Error('您沒有權限登入系統');
          case 429:
            throw new Error('登入嘗試過於頻繁，請稍後再試');
          case 500:
            throw new Error('伺服器錯誤，請稍後再試');
          default:
            throw new Error('登入失敗，請稍後再試');
        }
      }
      
      // 處理網路錯誤
      if (error.request) {
        throw new Error('無法連接到伺服器，請檢查網路連接');
      }
      
      // 其他錯誤
      throw new Error('登入過程中發生未知錯誤');
    }
  };

  return attemptLogin();
};

export const googleLogin = async (credential) => {
  try {
    console.log('開始 Google 登入流程', {
      hasCredential: !!credential,
      credentialLength: credential?.length,
      timestamp: new Date().toISOString()
    });
    
    if (!credential) {
      throw new Error('未收到 Google 登入憑證');
    }

    const response = await api.post('/auth/google-login', { 
      credential: credential
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Google 登入 API 呼叫成功:', {
      status: response.status,
      hasToken: !!response.data?.token,
      hasUser: !!response.data?.user,
      timestamp: new Date().toISOString()
    });

    if (!response.data || !response.data.token) {
      throw new Error('伺服器回應格式錯誤：缺少必要的登入資訊');
    }
    
    // 儲存認證資訊
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    // 連接 WebSocket
    websocket.connect();
    
    return response.data;
  } catch (error) {
    console.error('Google 登入失敗:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method
      },
      timestamp: new Date().toISOString()
    });

    let errorMessage = 'Google 登入失敗';
    if (error.response) {
      if (error.response.status === 400) {
        errorMessage = error.response.data?.message || 'Google 登入驗證失敗';
      } else if (error.response.status === 401) {
        errorMessage = '未授權的登入請求';
      } else if (error.response.status === 404) {
        errorMessage = 'Google 登入服務暫時不可用';
      } else if (error.response.status === 500) {
        errorMessage = '伺服器處理登入請求時發生錯誤';
      }
    } else if (error.request) {
      errorMessage = '無法連接到伺服器，請檢查網路連線';
    }

    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    enhancedError.status = error.response?.status;
    throw enhancedError;
  }
};

// Google 回調處理
export const handleGoogleCallback = async (code, state, nonce) => {
  try {
    console.log('處理 Google 回調:', {
      hasCode: !!code,
      hasState: !!state,
      hasNonce: !!nonce,
      timestamp: new Date().toISOString()
    });

    if (!code) {
      throw new Error('未收到 Google 授權碼');
    }

    const response = await api.post('/auth/google/callback', {
      code,
      state: state || '',
      nonce: nonce || '',
      redirect_uri: `${window.location.origin}/auth/google/callback`
    }, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Google 回調處理成功:', {
      status: response.status,
      hasToken: !!response.data?.token,
      hasUser: !!response.data?.user,
      timestamp: new Date().toISOString()
    });

    if (!response.data || !response.data.token) {
      throw new Error('伺服器回應格式錯誤：缺少必要的登入資訊');
    }

    // 儲存認證資訊
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    // 連接 WebSocket
    websocket.connect();

    return response.data;
  } catch (error) {
    console.error('Google 回調處理失敗:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method
      },
      timestamp: new Date().toISOString()
    });

    let errorMessage = 'Google 登入處理失敗';
    if (error.response) {
      if (error.response.status === 400) {
        errorMessage = error.response.data?.message || 'Google 登入驗證失敗';
      } else if (error.response.status === 401) {
        errorMessage = '未授權的登入請求';
      } else if (error.response.status === 404) {
        errorMessage = 'Google 登入服務暫時不可用';
      } else if (error.response.status === 500) {
        errorMessage = '伺服器處理登入請求時發生錯誤';
      }
    } else if (error.request) {
      errorMessage = '無法連接到伺服器，請檢查網路連線';
    }

    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    enhancedError.status = error.response?.status;
    throw enhancedError;
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

export const clearAllTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  
  // 清除所有相關的快取
  apiCache.clear();
};

export const logout = () => {
  // 登出時斷開 WebSocket 連接
  websocket.disconnect();
  
  // 清除所有令牌和快取
  clearAllTokens();
  
  // 重定向到登入頁面
  window.location.href = '/login';
};

// ----- 工作日誌 API -----
export const createWorkLog = async (workLogData) => {
  try {
    const response = await api.post('/work-logs', workLogData);
    return response.data;
  } catch (error) {
    console.error('創建工作日誌失敗:', error);
    throw error;
  }
};

export const searchWorkLogs = async (params) => {
  try {
    console.log('發送工作日誌搜索請求:', params);
    
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const response = await api.get(`/api/work-logs/search?${queryParams.toString()}`);
    
    console.log('工作日誌搜索響應:', response.data);
    
    if (!response.data || typeof response.data !== 'object') {
      throw new Error('獲取數據格式錯誤');
    }

    return response.data;
  } catch (error) {
    console.error('搜索工作日誌失敗:', error);
    if (error.response) {
      console.error('服務器響應:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('無服務器響應:', error.request);
    }
    throw error;
  }
};

export const getTodayHour = async () => {
  try {
    const response = await api.get('/work-logs/today-hour');
    return response.data;
  } catch (error) {
    console.error('獲取今日工時失敗:', error);
    return {
      total_hours: "0.00",
      remaining_hours: "8.00",
      is_complete: false
    };
  }
};

export const getTodayWorkHours = getTodayHour;

export const getUserDailyWorkLogs = async (userId, workDate) => {
  try {
    const response = await api.get('/work-logs/user-daily', { 
      params: { userId, workDate }
    });
    return response.data;
  } catch (error) {
    console.error('獲取用戶日誌失敗:', error);
    return {
      workLogs: [],
      totalHours: 0,
      isComplete: false
    };
  }
};

// 為了向後兼容，添加別名
export const getWorkLogsByDate = getUserDailyWorkLogs;

export const getAllWorkLogs = async () => {
  try {
    const response = await api.get('/work-logs/all');
    return response.data;
  } catch (error) {
    console.error('獲取所有工作日誌失敗:', error);
    return [];
  }
};

export const getWorkStats = async (startDate, endDate) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get('/work-logs/stats', { params });
    return response.data;
  } catch (error) {
    console.error('獲取工作統計失敗:', error);
    return {
      totalWorkLogs: 0,
      totalHours: 0,
      avgHoursPerDay: 0,
      topCategories: []
    };
  }
};

export const exportWorkLogs = async (filters, format = 'csv') => {
  const queryParams = new URLSearchParams({
    ...filters,
    format
  }).toString();
  
  window.open(`${api.defaults.baseURL}/work-logs/export?${queryParams}`);
};

// 獲取特定位置的作物列表
export const fetchLocationCrops = async (positionCode) => {
  try {
    const response = await api.get(`/work-logs/position/${positionCode}/crops`);
    return response.data;
  } catch (error) {
    console.error('獲取位置作物列表失敗:', error);
    return [];
  }
};

// ----- 公告 API -----
export const fetchNotices = async () => {
  try {
    const response = await api.get('/notices');
    console.log('獲取公告列表成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('獲取公告失敗:', {
      error,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    throw error;
  }
};

export const createNotice = async (noticeData) => {
  try {
    const response = await api.post('/notices', noticeData);
    console.log('創建公告成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('創建公告失敗:', {
      error,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    throw error;
  }
};

export const updateNotice = async (noticeId, noticeData) => {
  try {
    const response = await api.put(`/notices/${noticeId}`, noticeData);
    console.log('更新公告成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('更新公告失敗:', {
      error,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    throw error;
  }
};

export const deleteNotice = async (noticeId) => {
  try {
    console.log('準備刪除公告:', { noticeId });
    const response = await api.delete(`/notices/${noticeId}`);
    console.log('刪除公告成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('刪除公告失敗:', {
      noticeId,
      error,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      fullUrl: `${api.defaults.baseURL}/notices/${noticeId}`
    });
    
    // 如果是 404 錯誤，返回成功（因為公告已經不存在）
    if (error.response?.status === 404) {
      console.log('公告不存在，視為刪除成功');
      return { success: true, message: '公告已刪除' };
    }
    
    throw error;
  }
};

// ----- 使用者 API -----
export const fetchUsers = async () => {
  try {
    const response = await api.get('/users');
    return response.data;
  } catch (error) {
    console.error('獲取使用者列表失敗:', error);
    throw error;
  }
};

export const createUser = async (userData) => {
  try {
    const response = await api.post('/users', userData);
    return response.data;
  } catch (error) {
    console.error('創建使用者失敗:', error);
    throw error;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error('更新使用者失敗:', error);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('刪除使用者失敗:', error);
    throw error;
  }
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
  try {
    const response = await api.get('/data/locations');
    return response.data;
  } catch (error) {
    console.error('獲取位置資料失敗:', error);
    return [];
  }
};

export const fetchWorkCategories = async () => {
  try {
    const response = await api.get('/data/work-categories');
    return response.data;
  } catch (error) {
    console.error('獲取工作類別失敗:', error);
    return [];
  }
};

export const fetchProducts = async () => {
  try {
    const response = await api.get('/data/products');
    return response.data;
  } catch (error) {
    console.error('獲取產品資料失敗:', error);
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
  try {
    const response = await api.get('/admin/dash');
    return response.data;
  } catch (error) {
    console.error('獲取儀表板統計失敗:', error);
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

// 上傳工單附件
export const uploadWorkLogAttachment = async (workLogId, file) => {
  try {
    const formData = new FormData();
    formData.append('attachment', file);

    const response = await api.post(`/attachments/work-logs/${workLogId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error('上傳附件失敗:', error);
    throw error;
  }
};

// 獲取工單附件列表
export const getWorkLogAttachments = async (workLogId) => {
  try {
    const response = await api.get(`/attachments/work-logs/${workLogId}/attachments`);
    return response.data;
  } catch (error) {
    console.error('獲取附件列表失敗:', error);
    throw error;
  }
};

// 下載工單附件
export const downloadWorkLogAttachment = async (attachmentId) => {
  try {
    const response = await api.get(`/attachments/${attachmentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('下載附件失敗:', error);
    throw error;
  }
};

// 刪除工單附件
export const deleteWorkLogAttachment = async (attachmentId) => {
  try {
    const response = await api.delete(`/attachments/${attachmentId}`);
    return response.data;
  } catch (error) {
    console.error('刪除附件失敗:', error);
    throw error;
  }
};

// ----- 公告相關 API -----
export const getUnreadNoticeCount = async () => {
  try {
    const response = await api.get('/notices/unread');
    console.log('獲取未讀公告數量成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('獲取未讀公告數量失敗:', {
      error,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    return { unreadCount: 0 };
  }
};

export const markNoticeAsRead = async (noticeId) => {
  try {
    console.log('準備標記公告已讀:', { noticeId });
    const response = await api.post(`/notices/${noticeId}/read`);
    console.log('標記公告已讀成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('標記公告已讀失敗:', {
      noticeId,
      error,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    throw error;
  }
};

// ----- 工作日誌審核 API -----
export const reviewWorkLog = async (workLogId, status) => {
  try {
    const response = await api.patch(`/work-logs/${workLogId}/review`, { status });
    return response.data;
  } catch (error) {
    console.error('審核工作日誌失敗:', error);
    if (error.response) {
      console.error('服務器響應:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('無服務器響應:', error.request);
    }
    throw error;
  }
};

export const batchReviewWorkLogs = async (workLogIds, status) => {
  try {
    const response = await api.post('/work-logs/batch-review', {
      workLogIds,
      status
    });
    return response.data;
  } catch (error) {
    console.error('批量審核工作日誌失敗:', error);
    if (error.response) {
      console.error('服務器響應:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('無服務器響應:', error.request);
    }
    throw error;
  }
};

// ----- CSV 上傳 API -----
export const uploadCSV = async (csvFile) => {
  try {
    const formData = new FormData();
    formData.append('csvFile', csvFile);
    
    const response = await api.post('/work-logs/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('CSV 上傳失敗:', error);
    throw error;
  }
};

export const forceReauthenticate = async () => {
  // 清除所有存儲的認證信息
  clearAllTokens();
  
  // 重新載入頁面
  window.location.href = '/login';
};

// 附件相關 API
export const uploadAttachment = async (workLogId, file) => {
  try {
    const formData = new FormData();
    formData.append('attachment', file);

    const response = await api.post(`/attachments/work-logs/${workLogId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('上傳附件失敗:', error);
    throw error;
  }
};

export const getAttachments = async (workLogId) => {
  try {
    const response = await api.get(`/attachments/work-logs/${workLogId}/attachments`);
    return response.data;
  } catch (error) {
    console.error('獲取附件列表失敗:', error);
    throw error;
  }
};

export const downloadAttachment = async (attachmentId) => {
  try {
    const response = await api.get(`/attachments/${attachmentId}/download`, {
      responseType: 'blob'
    });
    return response;
  } catch (error) {
    console.error('下載附件失敗:', error);
    throw error;
  }
};

export const deleteAttachment = async (attachmentId) => {
  try {
    const response = await api.delete(`/attachments/${attachmentId}`);
    return response.data;
  } catch (error) {
    console.error('刪除附件失敗:', error);
    throw error;
  }
};

export const updateInventoryItems = async (items) => {
  try {
    const response = await api.post('/inventory/batch-update', { items });
    return response.data;
  } catch (error) {
    console.error('批量更新庫存項目時出錯:', error);
    throw error;
  }
};