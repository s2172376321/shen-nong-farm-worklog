import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// 導入頁面組件
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import WorkLogForm from './components/worklog/WorkLogForm';
import AdminDashboard from './components/admin/AdminDashboard';
import NoticeBoard from './components/common/NoticeBoard';
import UserDashboard from './components/user/UserDashboard';
import ChangePassword from './components/user/ChangePassword';

// 保護路由組件
const PrivateRoute = ({ element, adminOnly = false }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return element;
};

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
        {/* 公共路由 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* 受保護的路由 */}
        <Route path="/dashboard" element={<PrivateRoute element={<UserDashboard />} />} />
        <Route path="/work-log" element={<PrivateRoute element={<WorkLogForm />} />} />
        <Route path="/admin" element={<PrivateRoute element={<AdminDashboard />} adminOnly={true} />} />
        <Route path="/notices" element={<PrivateRoute element={<NoticeBoard />} />} />
        <Route path="/settings" element={<PrivateRoute element={<ChangePassword />} />} />
        
        {/* 預設重定向 */}
        <Route path="/" element={
          user ? (
            <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        
        {/* 捕捉所有其他路徑，重定向到主頁 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;