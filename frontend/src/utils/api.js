// 位置：frontend/src/utils/api.js
import axios from 'axios';

// 創建 axios 實例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  withCredentials: true
});

// 攔截器：為每個請求添加 Token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// 認證相關 API
export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const googleLogin = async (googleToken) => {
  const response = await api.post('/auth/google-login', { token: googleToken });
  return response.data;
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



// 工作日誌 API
export const createWorkLog = async (workLogData) => {
  const response = await api.post('/work-logs', workLogData);
  return response.data;
};

export const searchWorkLogs = async (filters) => {
  const response = await api.get('/work-logs/search', { params: filters });
  return response.data;
};

// 公告 API
export const fetchNotices = async () => {
  const response = await api.get('/notices');
  return response.data;
};

export const createNotice = async (noticeData) => {
  const response = await api.post('/notices', noticeData);
  return response.data;
};


// 取得所有使用者
export const fetchUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

// 創建新使用者
export const createUser = async (userData) => {
  const response = await api.post('/users', userData);
  return response.data;
};

// 更新公告
export const updateNotice = async (noticeId, noticeData) => {
  const response = await api.put(`/notices/${noticeId}`, noticeData);
  return response.data;
};

// 刪除公告
export const deleteNotice = async (noticeId) => {
  const response = await api.delete(`/notices/${noticeId}`);
  return response.data;
};

// 更新使用者
export const updateUser = async (userId, userData) => {
  const response = await api.put(`/users/${userId}`, userData);
  return response.data;
};

// 刪除使用者
export const deleteUser = async (userId) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};


// 审核工作日志
export const reviewWorkLog = async (workLogId, status) => {
  const response = await api.patch(`/work-logs/${workLogId}/review`, { status });
  return response.data;
};

// 獲取儀表板統計資訊
export const fetchDashboardStats = async () => {
  const response = await api.get('/stats/dashboard');
  return response.data;
};

// 綁定 Google 帳號
export const bindGoogleAccount = async (googleId, email) => {
  const response = await api.post('/users/bind-google', { 
    googleId, 
    email 
  });
  return response.data;
};

export default api;