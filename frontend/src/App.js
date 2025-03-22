// 位置：frontend/src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';


// 導入頁面組件
import LoginPage from './components/auth/LoginPage';
import UserDashboard from './components/user/UserDashboard';
import WorkLogDashboard from './components/worklog/WorkLogDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import NoticeBoard from './components/common/NoticeBoard';
import UserSettings from './components/user/UserSettings';
import PrivateRoute from './components/common/PrivateRoute';
import GoogleCallback from './components/auth/GoogleCallback';
import NotificationBadge from './components/common/NotificationBadge'; // 新增未讀通知組件

function App() {
  useEffect(() => {
    // 應用初始化時檢查令牌
    console.log('應用啟動時 - Token存在:', localStorage.getItem('token') ? '是' : '否');
  }, []);

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
      {/* 如果用戶已登入，顯示未讀通知徽章 */}
      {user && <NotificationBadge />}
      
      <Routes>
        {/* 公開路由 */}
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        
        {/* Google 登入回調路由 */}
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        
        {/* 首頁路由 - 根據使用者角色重定向 */}
        <Route path="/" element={
          user ? (
            user.role === 'admin' ? 
              <Navigate to="/admin" /> : 
              <Navigate to="/dashboard" />
          ) : (
            <Navigate to="/login" />
          )
        } />
        
        {/* 使用者儀表板路由 */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            <UserDashboard />
          </PrivateRoute>
        } />
        
        {/* 工作日誌路由 - 需要一般用戶權限 */}
        <Route path="/work-log" element={
          <PrivateRoute>
            <WorkLogDashboard />
          </PrivateRoute>
        } />
        
        {/* 使用者設定路由 */}
        <Route path="/settings" element={
          <PrivateRoute>
            <UserSettings />
          </PrivateRoute>
        } />
        
        {/* 公告欄路由 - 需要登入 */}
        <Route path="/notices" element={
          <PrivateRoute>
            <NoticeBoard />
          </PrivateRoute>
        } />
        
        {/* 管理員路由 - 需要管理員權限 */}
        <Route path="/admin/*" element={
          <PrivateRoute adminOnly={true}>
            <AdminDashboard />
          </PrivateRoute>
        } />
        
        {/* 預設路由 - 重定向到登入頁 */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;