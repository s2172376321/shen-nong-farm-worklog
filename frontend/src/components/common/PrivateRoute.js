// 位置：frontend/src/components/common/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PrivateRoute = ({ children, adminOnly = false }) => {
  // 暫時關閉登入驗證
  const mockUser = {
    id: '1',
    username: 'test',
    role: 'admin',
    isActive: true
  };

  // 直接返回子組件，不進行驗證
  return children;

  /* 原始驗證邏輯，暫時註釋掉
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/work-log" replace />;
  }

  return children;
  */
};

export default PrivateRoute;