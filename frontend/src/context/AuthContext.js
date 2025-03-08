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
      const response = await loginUser(email, password);
      
      // 儲存 token 和使用者資訊
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      setUser(response.user);
      
      // 返回使用者資訊，讓調用方決定如何導航
      return response.user;
    } catch (error) {
      console.error('登入失敗:', error);
      throw error;
    }
  };

  // Google 登入
  const loginWithGoogle = async (googleToken) => {
    try {
      const response = await googleLogin(googleToken);
      
      // 儲存 token 和使用者資訊
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      setUser(response.user);
      
      // 返回使用者資訊，讓調用方決定如何導航
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
    window.location.href = '/login'; // 登出時仍使用整頁刷新
  };

  // 更新使用者資訊 - 確保保留所有現有屬性
  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
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