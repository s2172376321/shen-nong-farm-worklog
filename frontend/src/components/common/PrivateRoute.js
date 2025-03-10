// 位置：frontend/src/components/common/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, isLoading } = useAuth();

  // 載入中顯示載入畫面
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 未登入，導向登入頁
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 管理員專用路由
  if (adminOnly && user.role !== 'admin') {
    // 如果是一般使用者，重定向到工作日誌頁面
    return <Navigate to="/work-log" replace />;
  }

  // 已登入且權限符合，顯示路由內容
  return children;
};

export default PrivateRoute;