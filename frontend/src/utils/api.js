// 位置：frontend/src/utils/api.js
import axios from 'axios';

// 創建 axios 實例，修改配置處理CORS問題
const api = axios.create({
  // 硬編碼API URL確保正確
  baseURL: 'http://localhost:3000/api',
  
  // 跨域請求時是否攜帶憑證
  withCredentials: false, // 為解決CORS問題先設為false
  
  // 增加超時設置
  timeout: 10000,
  
  // 額外的請求頭
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// 攔截器：為每個請求添加 Token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    console.log('發送API請求:', config.url); // 調試日誌
    return config;
  },
  error => {
    console.error('API請求錯誤:', error); // 調試日誌
    return Promise.reject(error);
  }
);

// 響應攔截器：統一處理錯誤
api.interceptors.response.use(
  response => {
    console.log('API響應成功:', response.config.url); // 調試日誌
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
    return Promise.reject(error);
  }
);

// ----- 認證相關 API -----
export const loginUser = async (email, password) => {
  try {
    console.log('嘗試登入用戶:', email);
    const response = await api.post('/auth/login', { email, password });
    console.log('登入成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('登入失敗:', error);
    throw error;
  }
};

export const googleLogin = async (googleToken) => {
  try {
    console.log('嘗試Google登入');
    const response = await api.post('/auth/google-login', { token: googleToken });
    console.log('Google登入成功');
    return response.data;
  } catch (error) {
    console.error('Google登入失敗:', error);
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

// ----- 工作日誌 API -----
export const createWorkLog = async (workLogData) => {
  const formattedData = {
    location_code: workLogData.location_code,
    position_code: workLogData.position_code,
    position_name: workLogData.position_name,
    work_category_code: workLogData.work_category_code,
    work_category_name: workLogData.work_category_name,
    start_time: workLogData.startTime,
    end_time: workLogData.endTime,
    details: workLogData.details,
    harvest_quantity: workLogData.harvestQuantity || 0,
    product_id: workLogData.product_id || null,
    product_name: workLogData.product_name || null,
    product_quantity: workLogData.product_quantity || 0
  };
  
  const response = await api.post('/work-logs', formattedData);
  return response.data;
};

export const searchWorkLogs = async (filters) => {
  const response = await api.get('/work-logs/search', { params: filters });
  return response.data;
};

export const reviewWorkLog = async (workLogId, status) => {
  const response = await api.patch(`/work-logs/${workLogId}/review`, { status });
  return response.data;
};

// 獲取今日工作時數
export const fetchTodayHours = async () => {
  const response = await api.get('/work-logs/today-hours');
  return response.data;
};

// ----- 公告 API -----
export const fetchNotices = async () => {
  const response = await api.get('/notices');
  return response.data;
};

export const createNotice = async (noticeData) => {
  const response = await api.post('/notices', noticeData);
  return response.data;
};

export const updateNotice = async (noticeId, noticeData) => {
  const response = await api.put(`/notices/${noticeId}`, noticeData);
  return response.data;
};

export const deleteNotice = async (noticeId) => {
  const response = await api.delete(`/notices/${noticeId}`);
  return response.data;
};

// ----- 使用者 API -----
export const fetchUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const createUser = async (userData) => {
  const response = await api.post('/users', userData);
  return response.data;
};

export const updateUser = async (userId, userData) => {
  const response = await api.put(`/users/${userId}`, userData);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};

export const checkUsernameAvailability = async (username) => {
  const response = await api.get(`/users/check-username/${username}`);
  return response.data;
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
  const response = await api.get('/data/locations');
  return response.data;
};

export const fetchWorkCategories = async () => {
  const response = await api.get('/data/work-categories');
  return response.data;
};

export const fetchProducts = async () => {
  const response = await api.get('/data/products');
  return response.data;
};

// ----- 儀表板 API -----
export const fetchDashboardStats = async () => {
  const response = await api.get('/stats/dashboard');
  return response.data;
};

export default api;