// 位置：frontend/src/components/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardStats, getUnreadNoticeCount } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import UserManagement from './UserManagement';
import WorkLogReview from './WorkLogReview';
import NoticeManagement from './NoticeManagement';
import NoticeBoard from '../common/NoticeBoard';
import ChangePassword from '../user/ChangePassword';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingWorkLogs: 0,
    unreadNotices: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 管理功能區塊
  const sections = [
    {
      title: '使用者管理',
      component: UserManagement,
      description: '查看、新增和管理系統使用者',
      icon: '👤'
    },
    {
      title: '工作日誌審核',
      component: WorkLogReview,
      description: '審核和管理員工工作日誌',
      icon: '📋'
    },
    {
      title: '公告管理',
      component: NoticeManagement,
      description: '發布和管理系統公告',
      icon: '📢'
    },
    {
      title: '公告欄',
      component: props => <NoticeBoard {...props} onNoticeRead={handleNoticeRead} />,
      description: '查看所有公告',
      icon: '📰'
    },
    {
      title: '庫存管理',
      component: () => {
        const handleClick = () => {
          navigate('/inventory');
        };
        return (
          <div onClick={handleClick} style={{ cursor: 'pointer' }}>
            庫存管理
          </div>
        );
      },
      description: '管理系統庫存',
      icon: '📦'
    },
    {
      title: '修改密碼',
      component: ChangePassword,
      description: '修改您的登入密碼',
      icon: '🔒'
    }
  ];

  // 載入統計資訊
  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsData = await fetchDashboardStats();
        setStats(statsData);
        setIsLoading(false);
      } catch (err) {
        setError('載入統計資訊失敗');
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  // 載入未讀公告數量
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response = await getUnreadNoticeCount();
        setStats(prev => ({
          ...prev,
          unreadNotices: response.unreadCount
        }));
      } catch (err) {
        console.error('載入未讀公告數量失敗:', err);
      }
    };
    
    loadUnreadCount();
    
    // 定期更新未讀數量 (每5分鐘)
    const interval = setInterval(loadUnreadCount, 5 * 60 * 1000);
    
    // 清理函數
    return () => clearInterval(interval);
  }, []);

  // 當通知被閱讀時更新未讀數量
  function handleNoticeRead() {
    getUnreadNoticeCount()
      .then(response => {
        setStats(prev => ({
          ...prev,
          unreadNotices: response.unreadCount
        }));
      })
      .catch(err => console.error('更新未讀公告數量失敗:', err));
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 如果沒有選擇具體區塊，顯示儀表板總覽
  if (!activeSection) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex">
        {/* 側邊導航欄 */}
        <div className="w-64 bg-gray-800 p-4 min-h-screen">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-blue-400">神農山莊</h2>
            <p className="text-sm text-gray-400">管理員系統</p>
          </div>
          
          {/* 管理員資訊 */}
          <div className="mb-6 p-3 bg-gray-700 rounded-lg">
            <div className="font-semibold">{user.username}</div>
            <div className="text-sm text-gray-400">{user.email}</div>
            <div className="text-sm text-gray-400">管理員</div>
          </div>
          
          {/* 導航選單 */}
          <div className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.title}
                onClick={() => setActiveSection(section)}
                className="w-full text-left px-4 py-3 rounded-lg flex items-center text-gray-300 hover:bg-gray-700"
              >
                <span className="mr-3">{section.icon}</span>
                {section.title}
                {section.title === '公告欄' && stats.unreadNotices > 0 && (
                  <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {stats.unreadNotices}
                  </span>
                )}
              </button>
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
        <div className="flex-1 p-6">
          <div className="container mx-auto">
            <h1 className="text-3xl font-bold mb-8">管理員儀表板</h1>
            
            {/* 統計資訊 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">總使用者數</h3>
                <p className="text-2xl text-blue-400">
                  {isLoading ? 'N/A' : stats.totalUsers}
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">待審核工作日誌</h3>
                <p className="text-2xl text-blue-400">
                  {isLoading ? 'N/A' : stats.pendingWorkLogs}
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">未讀公告</h3>
                <p className="text-2xl text-blue-400">
                  {isLoading ? 'N/A' : stats.unreadNotices}
                </p>
                {stats.unreadNotices > 0 && (
                  <p className="text-xs text-blue-300 mt-1">您有新的未讀公告</p>
                )}
              </div>
            </div>
            
            {/* 管理功能區塊 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {sections.slice(0, 3).map((section, index) => (
                <div 
                  key={index}
                  className="bg-gray-800 p-6 rounded-lg shadow-md hover:bg-gray-700 transition-all duration-300 cursor-pointer group"
                  onClick={() => setActiveSection(section)}
                >
                  <h2 className="text-xl font-semibold mb-4 text-blue-400 group-hover:text-blue-300">
                    <span className="mr-2">{section.icon}</span>
                    {section.title}
                  </h2>
                  <p className="text-gray-400 mb-4">{section.description}</p>
                  <div className="text-right">
                    <button 
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      進入管理
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 其他功能區塊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {sections.slice(3, 5).map((section, index) => (
                <div 
                  key={index}
                  className="bg-gray-800 p-6 rounded-lg shadow-md hover:bg-gray-700 transition-all duration-300 cursor-pointer group"
                  onClick={() => setActiveSection(section)}
                >
                  <div className="flex justify-between items-start">
                    <h2 className="text-xl font-semibold mb-4 text-blue-400 group-hover:text-blue-300">
                      <span className="mr-2">{section.icon}</span>
                      {section.title}
                    </h2>
                    {section.title === '公告欄' && stats.unreadNotices > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                        {stats.unreadNotices}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 mb-4">{section.description}</p>
                  <div className="text-right">
                    <button 
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      前往
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-600 text-white p-3 rounded-lg mt-4">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 渲染選中的管理頁面
  const ActiveComponent = activeSection.component;
  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* 側邊導航欄 */}
      <div className="w-64 bg-gray-800 p-4 min-h-screen">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-blue-400">神農山莊</h2>
          <p className="text-sm text-gray-400">管理員系統</p>
        </div>
        
        {/* 管理員資訊 */}
        <div className="mb-6 p-3 bg-gray-700 rounded-lg">
          <div className="font-semibold">{user.username}</div>
          <div className="text-sm text-gray-400">{user.email}</div>
          <div className="text-sm text-gray-400">管理員</div>
        </div>
        
        {/* 導航選單 */}
        <div className="space-y-2">
          {sections.map((section) => (
            <button
              key={section.title}
              onClick={() => setActiveSection(section)}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${
                activeSection.title === section.title 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="mr-3">{section.icon}</span>
              {section.title}
              {section.title === '公告欄' && 
               activeSection.title !== '公告欄' && 
               stats.unreadNotices > 0 && (
                <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  {stats.unreadNotices}
                </span>
              )}
            </button>
          ))}
          
          {/* 返回儀表板 */}
          <button
            onClick={() => setActiveSection(null)}
            className="w-full text-left px-4 py-3 rounded-lg flex items-center text-gray-300 hover:bg-gray-700"
          >
            <span className="mr-3">🏠</span>
            返回儀表板
          </button>
          
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{activeSection.title}</h1>
        </div>
        <ActiveComponent onNoticeRead={handleNoticeRead} />
      </div>
    </div>
  );
};

export default AdminDashboard;