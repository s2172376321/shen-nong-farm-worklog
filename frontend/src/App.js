import React from 'react';
import { useAuth } from './context/AuthContext';

// 導入頁面組件
import LoginPage from './components/auth/LoginPage';
import WorkLogForm from './components/worklog/WorkLogForm';
import AdminDashboard from './components/admin/AdminDashboard';
import NoticeBoard from './components/common/NoticeBoard';

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

  // 未登入，顯示登入頁面
  if (!user) {
    return <LoginPage />;
  }

  // 根據使用者角色渲染不同頁面
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {user.role === 'admin' ? <AdminDashboard /> : <WorkLogForm />}
    </div>
  );
}

export default App;