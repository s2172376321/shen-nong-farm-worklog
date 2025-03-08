// 位置：frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, googleLogin } from '../utils/api';

const AuthContext = createContext({
  user: null,
  isLoading: true,
  login: () => {},
  loginWithGoogle: () => {},
  logout: () => {},
  updateUser: () => {}
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 根據角色重定向
  const redirectBasedOnRole = (userRole) => {
    switch (userRole) {
      case 'admin':
        window.location.href = '/admin';
        break;
      case 'user':
      default:
        window.location.href = '/dashboard'; // 改為新的儀表板路徑
        break;
    }
  };

  // 檢查是否已登入
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        // 無效的使用者資料
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  // 一般登入
  const login = async (email, password) => {
    try {
      console.log('執行登入API請求...');
      const response = await loginUser(email, password);
      console.log('登入API回應:', response);
      
      if (!response || !response.token) {
        throw new Error('登入回應缺少必要資訊');
      }
      
      // 儲存 token 和使用者資訊
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      setUser(response.user);
      
      // 不在函數內立即重定向，而是返回用戶資訊
      // 讓調用代碼決定是否重定向
      return response.user;
    } catch (error) {
      console.error('登入失敗:', error);
      // 更詳細的錯誤記錄
      if (error.response) {
        console.error('伺服器回應:', error.response.status, error.response.data);
      }
      throw error;
    }
  };

  // Google 登入
  const loginWithGoogle = async (googleToken) => {
    try {
      console.log('執行Google登入API請求...');
      const response = await googleLogin(googleToken);
      console.log('Google登入API回應:', response);
      
      if (!response || !response.token) {
        throw new Error('Google登入回應缺少必要資訊');
      }
      
      // 儲存 token 和使用者資訊
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      setUser(response.user);
      
      // 不在函數內立即重定向，而是返回用戶資訊
      return response.user;
    } catch (error) {
      console.error('Google 登入失敗:', error);
      if (error.response) {
        console.error('伺服器回應:', error.response.status, error.response.data);
      }
      throw error;
    }
  };

  // 登出
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  // 更新使用者資訊
  const updateUser = (userData) => {
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
      redirectBasedOnRole  // 導出重定向函數，讓其他組件可以使用
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