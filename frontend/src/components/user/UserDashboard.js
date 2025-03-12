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
        const response = await getUnreadNoticeCount();
        setUnreadNotices(response.unreadCount);
      } catch (err) {
        console.error('載入未讀公告數量失敗:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUnreadCount();
    
    // 定期更新未讀數量 (每5分鐘)
    const interval = setInterval(loadUnreadCount, 5 * 60 * 1000);
    
    // 清理函數
    return () => clearInterval(interval);
  }, []);

  // 當NoticeBoard標記公告為已讀時更新未讀數量
  const handleNoticeRead = () => {
    // 重新獲取未讀數量
    getUnreadNoticeCount()
      .then(response => setUnreadNotices(response.unreadCount))
      .catch(err => console.error('更新未讀公告數量失敗:', err));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="flex h-screen">
        {/* 側邊導航 */}
        <div className="w-64 bg-gray-800 p-4">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-blue-400">神農山莊</h2>
            <p className="text-sm text-gray-400">工作日誌系統</p>
          </div>
          
          {/* 用戶資訊 */}
          <div className="mb-6 p-3 bg-gray-700 rounded-lg">
            <div className="font-semibold">{user.username}</div>
            <div className="text-sm text-gray-400">{user.email}</div>
          </div>
          
          {/* 導航選單 */}
          <div className="space-y-2">
            {navItems.map(item => (
              <Link
                key={item.id}
                to={item.path}
                className="w-full text-left px-4 py-3 rounded-lg flex items-center text-gray-300 hover:bg-gray-700"
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
                {item.id === 'notices' && unreadNotices > 0 && (
                  <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {unreadNotices}
                  </span>
                )}
              </Link>
            ))}
            
            {/* 登出按鈕 */}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-lg flex items-center text-red-400 hover:bg-gray-700"
            >
              <span className="mr-3">🚪</span>
              登出
            </button>
          </div>
        </div>
        
        {/* 主要內容區 */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h1 className="text-2xl font-bold mb-6">歡迎回來，{user.username}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">總工作日誌</h3>
              <p className="text-2xl text-blue-400">8</p>
            </Card>
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">本月工作時數</h3>
              <p className="text-2xl text-blue-400">24.5</p>
            </Card>
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">未讀公告</h3>
              {isLoading ? (
                <div className="animate-pulse h-8 bg-gray-700 rounded"></div>
              ) : (
                <p className="text-2xl text-blue-400">{unreadNotices}</p>
              )}
              {unreadNotices > 0 && (
                <p className="text-xs text-blue-300 mt-1">您有新的公告，請查看</p>
              )}
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className="p-4">
                <h2 className="text-xl font-semibold mb-4">近期公告</h2>
                <NoticeBoard 
                  preview={true} 
                  onNoticeRead={handleNoticeRead}
                />
                <div className="mt-4 text-right">
                  <Link to="/notices" className="text-blue-400 hover:text-blue-300">
                    查看全部公告 →
                  </Link>
                </div>
              </Card>
            </div>
            <div>
              <Card className="p-4">
                <h2 className="text-xl font-semibold mb-4">快速操作</h2>
                <div className="space-y-2">
                  <Link to="/work-log" className="block w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-center">
                    填寫工作日誌
                  </Link>
                  <Link to="/settings" className="block w-full py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-center">
                    帳號設定
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;