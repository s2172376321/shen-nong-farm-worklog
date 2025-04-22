// frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, googleLogin } from '../utils/api';

const AuthContext = createContext({
  user: null,
  isLoading: true,
  login: () => {},
  loginWithGoogle: () => {},
  logout: () => {},
  updateUser: () => {},
  isAdmin: () => false
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authLogs, setAuthLogs] = useState([]);
  
  // 調試日誌函數
  const logAuth = (message, data = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      ...data
    };
    console.log(`[Auth] ${message}`, data);
    setAuthLogs(prev => [...prev, logEntry]);
  };

  // 檢查是否為管理員
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  // 根據角色重定向
  const redirectBasedOnRole = (userRole) => {
    logAuth('準備重定向', { role: userRole });
    
    switch (userRole) {
      case 'admin':
        logAuth('重定向到管理員頁面');
        window.location.href = '/admin';
        break;
      case 'user':
      default:
        logAuth('重定向到儀表板頁面');
        window.location.href = '/dashboard';
        break;
    }
  };

  // 檢查是否已登入
  useEffect(() => {
    const checkAuth = async () => {
      logAuth('檢查認證狀態');
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          logAuth('發現認證令牌和用戶數據');
          // 檢查 token 是否仍然有效
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          logAuth('認證成功，用戶已設置', { role: parsedUser.role });
        } catch (error) {
          logAuth('解析用戶數據失敗', { error: error.message });
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        logAuth('未找到認證信息');
        setUser(null);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // 一般登入
  const login = async (username, password) => {
    try {
      logAuth('嘗試使用用戶名密碼登入', { 
        username,
        hasPassword: !!password
      });
      
      if (!username || !password) {
        logAuth('登入失敗：缺少用戶名或密碼');
        throw new Error('請輸入用戶名和密碼');
      }
      
      // 確保請求體格式正確
      const loginData = {
        username: username.trim(),
        password: password
      };
      
      const response = await loginUser(loginData.username, loginData.password);
      logAuth('登入 API 響應成功', { 
        hasToken: !!response.token,
        hasUser: !!response.user
      });
      
      if (!response.token) {
        logAuth('登入響應缺少令牌');
        throw new Error('服務器響應缺少認證令牌');
      }
      
      // 儲存 token 和使用者資訊
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      logAuth('用戶數據已存儲到本地', { role: response.user.role });
      setUser(response.user);
      
      // 直接重定向
      redirectBasedOnRole(response.user.role);
      
      return response.user;
    } catch (error) {
      logAuth('登入過程中發生錯誤', { 
        message: error.message,
        response: error.response?.data,
        request: error.request ? '請求已發送' : '請求未發送'
      });
      throw error;
    }
  };
  
  // Google 登入 - 進階診斷版本
  const loginWithGoogle = async (credential) => {
    try {
      logAuth('使用 Google 憑證登入', { 
        credentialLength: credential?.length 
      });
      
      if (!credential) {
        logAuth('Google 登入失敗：缺少憑證');
        throw new Error('缺少 Google 憑證');
      }
      
      // 使用明確的 credential 參數名稱
      logAuth('調用 Google 登入 API');
      const response = await googleLogin(credential);
      
      logAuth('Google 登入 API 響應', { 
        status: 'success',
        hasToken: !!response.token,
        hasUser: !!response.user,
        tokenSubstr: response.token ? response.token.substring(0, 10) + '...' : 'missing'
      });
      
      if (!response.token) {
        logAuth('Google 登入響應缺少令牌');
        throw new Error('服務器響應缺少認證令牌');
      }
      
      // 儲存 token 和使用者資訊
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      logAuth('Google 登入用戶數據已存儲', { 
        role: response.user.role,
        username: response.user.username,
        email: response.user.email
      });
      
      setUser(response.user);
      
      // 使用 setTimeout 確保狀態更新後再重定向
      setTimeout(() => {
        logAuth('執行延遲重定向');
        redirectBasedOnRole(response.user.role);
      }, 100);
      
      return response;
    } catch (error) {
      logAuth('Google 登入失敗', { 
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  };

  // 登出
  const logout = () => {
    logAuth('執行登出操作');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  // 更新使用者資訊
  const updateUser = (userData) => {
    logAuth('更新用戶數據', { userId: userData.id });
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      loginWithGoogle,
      logout,
      updateUser,
      isAdmin,
      authLogs // 添加日誌到 context
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// 自定義 Hook 來使用認證上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必須在 AuthProvider 內使用');
  }
  return context;
};

export default AuthContext;