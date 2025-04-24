import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5004/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 清除本地存儲
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 重定向到登入頁面
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 用戶相關 API
export const loginUser = async (username, password) => {
  try {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  } catch (error) {
    console.error('登入失敗:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const googleLogin = async (token) => {
  const response = await api.post('/auth/google', { token });
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

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

export const changePassword = async (passwordData) => {
  const response = await api.post('/auth/change-password', passwordData);
  return response.data;
};

export const bindGoogleAccount = async (token) => {
  const response = await api.post('/auth/bind-google', { token });
  return response.data;
};

export const unbindGoogleAccount = async () => {
  const response = await api.post('/auth/unbind-google');
  return response.data;
};

// 工作記錄相關 API
export const createWorkLog = async (workLogData) => {
  const response = await api.post('/worklogs', workLogData);
  return response.data;
};

export const getWorkLogsByDate = async (date) => {
  const response = await api.get(`/worklogs/date/${date}`);
  return response.data;
};

export const getTodayWorkHours = async () => {
  const response = await api.get('/worklogs/today/hours');
  return response.data;
};

export const searchWorkLogs = async (params) => {
  const response = await api.get('/worklogs/search', { params });
  return response.data;
};

export const reviewWorkLog = async (workLogId, reviewData) => {
  const response = await api.post(`/worklogs/${workLogId}/review`, reviewData);
  return response.data;
};

export const batchReviewWorkLogs = async (reviewData) => {
  const response = await api.post('/worklogs/batch-review', reviewData);
  return response.data;
};

export const getUserDailyWorkLogs = async (userId, date) => {
  const response = await api.get(`/worklogs/user/${userId}/date/${date}`);
  return response.data;
};

export const uploadCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/worklogs/upload-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// 附件相關 API
export const getWorkLogAttachments = async (workLogId) => {
  const response = await api.get(`/worklogs/${workLogId}/attachments`);
  return response.data;
};

export const uploadWorkLogAttachment = async (workLogId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/worklogs/${workLogId}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const downloadWorkLogAttachment = async (workLogId, attachmentId) => {
  const response = await api.get(`/worklogs/${workLogId}/attachments/${attachmentId}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const deleteWorkLogAttachment = async (workLogId, attachmentId) => {
  const response = await api.delete(`/worklogs/${workLogId}/attachments/${attachmentId}`);
  return response.data;
};

// 公告相關 API
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

export const markNoticeAsRead = async (noticeId) => {
  const response = await api.post(`/notices/${noticeId}/read`);
  return response.data;
};

export const getUnreadNoticeCount = async () => {
  try {
    const response = await api.get('/notices/unread-count');
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

// 位置和作物相關 API
export const fetchLocations = async () => {
  const response = await api.get('/locations');
  return response.data;
};

export const fetchLocationsByArea = async (areaId) => {
  const response = await api.get(`/locations/area/${areaId}`);
  return response.data;
};

export const fetchLocationCrops = async (locationId) => {
  const response = await api.get(`/locations/${locationId}/crops`);
  return response.data;
};

export const fetchWorkCategories = async () => {
  const response = await api.get('/work-categories');
  return response.data;
};

// 產品相關 API
export const fetchProducts = async () => {
  const response = await api.get('/products');
  return response.data;
};

// 儀表板統計 API
export const fetchDashboardStats = async () => {
  const response = await api.get('/dashboard/stats');
  return response.data;
};

export const getTodayHour = async () => {
  const response = await api.get('/dashboard/today-hours');
  return response.data;
};

// 快取相關
export const apiCache = {
  set: (key, value) => {
    localStorage.setItem(`api_cache_${key}`, JSON.stringify(value));
  },
  get: (key) => {
    const value = localStorage.getItem(`api_cache_${key}`);
    return value ? JSON.parse(value) : null;
  },
  remove: (key) => {
    localStorage.removeItem(`api_cache_${key}`);
  },
  clear: () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('api_cache_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

export default api;