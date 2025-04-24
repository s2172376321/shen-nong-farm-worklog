// 位置：frontend/src/components/common/NotificationBadge.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUnreadNoticeCount } from '../../utils/api';

/**
 * 小型未讀公告提示組件，顯示未讀公告數量
 * 可以點擊導航到公告頁面
 */
const NotificationBadge = () => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // 載入未讀公告數量
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        setIsLoading(true);
        const response = await getUnreadNoticeCount();
        setUnreadCount(response.unreadCount);
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

  // 處理點擊事件
  const handleClick = () => {
    navigate('/notices');
  };

  // 如果沒有未讀消息則不顯示
  if (unreadCount === 0 && !isLoading) {
    return null;
  }

  return (
    <div 
      className="fixed top-4 right-4 z-50 cursor-pointer"
      onClick={handleClick}
      title="點擊查看未讀公告"
    >
      <div className="relative">
        <div className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-1" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
            />
          </svg>
          
          {isLoading ? (
            <div className="h-5 w-5 animate-pulse bg-blue-400 rounded-full"></div>
          ) : (
            <span className="font-semibold">{unreadCount}</span>
          )}
        </div>
        
        {/* 閃爍效果提示有新消息 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping"></span>
        )}
      </div>
    </div>
  );
};

export default NotificationBadge;