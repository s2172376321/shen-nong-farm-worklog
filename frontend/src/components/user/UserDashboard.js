// 位置：frontend/src/components/user/UserDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NoticeBoard from '../common/NoticeBoard';
import { Card } from '../ui';
import { getUnreadNoticeCount } from '../../utils/api';

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadNotices, setUnreadNotices] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 導航選項
  const navItems = [
    { id: 'notices', label: '公告事項', icon: '📢', path: '/notices' },
    { id: 'worklog', label: '填寫工作日誌', icon: '📝', path: '/work-log' },
    { id: 'settings', label: '帳號設定', icon: '⚙️', path: '/settings' }
  ];

  // 載入未讀公告數量
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getUnreadNoticeCount();
        setUnreadNotices(response.unreadCount);
      } catch (err) {
        console.error('載入未讀公告數量失敗:', err);
        setError('無法載入未讀公告數量');
        setUnreadNotices(0);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      loadUnreadCount();
    }
  }, [user]);

  const handleLogout = () => {
    try {
      logout();
      navigate('/login');
    } catch (err) {
      console.error('登出時發生錯誤:', err);
      navigate('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400 mb-4"></div>
          <p className="text-gray-400">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">
                歡迎回來，{user?.name || user?.username}
              </h1>
              <p className="text-gray-400">
                {user?.email && `郵箱: ${user.email}`}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              登出
            </button>
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-4">
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className="block p-6 bg-gray-700 rounded-lg shadow hover:bg-gray-600 transition duration-200"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{item.icon}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-100">
                      {item.label}
                    </h2>
                    {item.id === 'notices' && unreadNotices > 0 && (
                      <span className="inline-block bg-blue-500 text-white text-xs px-2 py-1 rounded-full ml-2">
                        {unreadNotices}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-100 mb-4">最新公告</h2>
          <NoticeBoard preview={true} limit={3} showViewAll={true} />
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;