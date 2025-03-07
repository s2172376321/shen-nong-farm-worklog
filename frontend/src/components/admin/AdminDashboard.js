// 位置：frontend/src/components/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { fetchDashboardStats } from '../../utils/api';
import UserManagement from './UserManagement';
import WorkLogReview from './WorkLogReview';
import NoticeManagement from './NoticeManagement';

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingWorkLogs: 0,
    unreadNotices: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const sections = [
    {
      title: '使用者管理',
      component: UserManagement,
      description: '查看、新增和管理系統使用者'
    },
    {
      title: '工作日誌審核',
      component: WorkLogReview,
      description: '審核和管理員工工作日誌'
    },
    {
      title: '公告管理',
      component: NoticeManagement,
      description: '發布和管理系統公告'
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

  // 如果沒有選擇具體區塊，顯示總覽
  if (!activeSection) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold mb-8">管理員儀表板</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sections.map((section, index) => (
              <div 
                key={index}
                className="bg-gray-800 p-6 rounded-lg shadow-md hover:bg-gray-700 transition-all duration-300 cursor-pointer group"
                onClick={() => setActiveSection(section)}
              >
                <h2 className="text-xl font-semibold mb-4 text-blue-400 group-hover:text-blue-300">
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

          {/* 統計資訊 */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </div>
          </div>

          {error && (
            <div className="bg-red-600 text-white p-3 rounded-lg mt-4">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 渲染選中的管理頁面
  const ActiveComponent = activeSection.component;
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => setActiveSection(null)}
            className="mr-4 text-blue-400 hover:text-blue-300"
          >
            ← 返回儀表板
          </button>
          <h1 className="text-2xl font-bold">{activeSection.title}</h1>
        </div>
        <ActiveComponent />
      </div>
    </div>
  );
};

export default AdminDashboard;