// 位置：frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// 導入頁面組件
import LoginPage from './components/auth/LoginPage';
import WorkLogDashboard from './components/worklog/WorkLogDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import NoticeBoard from './components/common/NoticeBoard';
import PrivateRoute from './components/common/PrivateRoute';

function App() {
  const { user, isLoading } = useAuth();

  // 載入中狀態
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* 公開路由 */}
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        
        {/* 保護路由 - 需要登入 */}
        <Route path="/" element={
          <PrivateRoute>
            {user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/work-log" />}
          </PrivateRoute>
        } />
        
        {/* 工作日誌路由 - 一般使用者 */}
        <Route path="/work-log" element={
          <PrivateRoute>
            <WorkLogDashboard />
          </PrivateRoute>
        } />
        
        {/* 公告欄路由 */}
        <Route path="/notices" element={
          <PrivateRoute>
            <NoticeBoard />
          </PrivateRoute>
        } />
        
        {/* 管理員路由 */}
        <Route path="/admin/*" element={
          <PrivateRoute adminOnly={true}>
            <AdminDashboard />
          </PrivateRoute>
        } />
        
        {/* 預設路由 - 重定向到根路由 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;