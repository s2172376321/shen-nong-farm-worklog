// 位置：frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ApiStatusProvider } from './context/ApiStatusProvider';

// 導入頁面組件
import LoginPage from './components/auth/LoginPage';
import UserDashboard from './components/user/UserDashboard';
import WorkLogDashboard from './components/worklog/WorkLogDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import NoticeBoard from './components/common/NoticeBoard';
import UserSettings from './components/user/UserSettings';
import PrivateRoute from './components/common/PrivateRoute';
import GoogleCallback from './components/auth/GoogleCallback'; 
import InventoryDashboard from './components/inventory/InventoryDashboard';
import InventoryList from './components/inventory/InventoryList';
import InventoryDetail from './components/inventory/InventoryDetail';

// 首頁路由組件
function HomeRoute() {
  const { user } = useAuth();
  
  // 根據用戶角色重定向到相應的儀表板
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (user.role === 'admin') {
    return <Navigate to="/admin" />;
  }
  
  return <Navigate to="/dashboard" />;
}

function AppContent() {
  return (
    <Router>
      <Routes>
        {/* 公開路由 */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Google 登入回調路由 */}
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        
        {/* 首頁路由 - 根據用戶角色導向不同儀表板 */}
        <Route path="/" element={<HomeRoute />} />
        
        {/* 使用者儀表板路由 */}
        <Route path="/dashboard" element={<UserDashboard />} />
        
        {/* 工作日誌路由 */}
        <Route path="/work-log" element={<WorkLogDashboard />} />
        
        {/* 使用者設定路由 */}
        <Route path="/settings" element={<UserSettings />} />
        
        {/* 公告欄路由 */}
        <Route path="/notices" element={<NoticeBoard />} />
        
        {/* 庫存管理路由 */}
        <Route path="/inventory" element={<InventoryDashboard />} />
        <Route path="/inventory/list" element={<InventoryList />} />
        <Route path="/inventory/:id" element={<InventoryDetail />} />
        
        {/* 管理員路由 */}
        <Route path="/admin/*" element={<AdminDashboard />} />
        
        {/* 預設路由 - 重定向到首頁 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ApiStatusProvider>
      <AppContent />
    </ApiStatusProvider>
  );
}

export default App;