// 位置：frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, googleLogin } from '../utils/api';
import api, { apiCache, throttle } from '../utils/api';


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
      window.location.href = '/dashboard';  // 從 /work-log 改為 /dashboard
      break;
  }
};



  // 檢查是否已登入
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          // 檢查 token 是否仍然有效 (這裡可以加入驗證 token 的邏輯)
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (error) {
          // token 無效或使用者資料解析錯誤，清除儲存的資訊
          console.error('使用者資料解析失敗:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        // 沒有 token 或使用者資料，表示未登入
        setUser(null);
      }
      
      // 完成載入
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // 一般登入
  const login = async (username, password) => {
    try {
      console.log('從 AuthContext 嘗試登入:', username);
      const response = await loginUser(username, password);
      
      // 儲存 token 和使用者資訊
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
  
      setUser(response.user);
      return response.user;
    } catch (error) {
      console.error('登入失敗:', error);
      throw error;
    }
  };
  

  // Google 登入
  const loginWithGoogle = async (credential) => {
    try {
      console.log('發送Google登入請求，憑證長度:', credential?.length);
      
      // 明確使用token參數名稱
      const response = await googleLogin(credential);
      
      // 儲存 token 和使用者資訊
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
      return response.user;
    } catch (error) {
      console.error('Google 登入失敗:', error);
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

  // 更新使用者資訊const
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
      updateUser
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