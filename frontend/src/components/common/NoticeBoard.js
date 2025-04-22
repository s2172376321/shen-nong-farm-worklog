// 位置：frontend/src/components/common/NoticeBoard.js
import React, { useState, useEffect } from 'react';
import { fetchNotices, markNoticeAsRead } from '../../utils/api';
import { Card, Button } from '../ui';
import { useNavigate, useLocation } from 'react-router-dom';

const NoticeBoard = ({ preview = false, limit = 3, showViewAll = false, onNoticeRead }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notices, setNotices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadNotices = async () => {
      try {
        const data = await fetchNotices();
        setNotices(data);
        setIsLoading(false);
      } catch (err) {
        setError('載入公告失敗');
        setIsLoading(false);
      }
    };

    loadNotices();
  }, []);

  // 返回上一頁
  const handleGoBack = () => {
    navigate(-1);
  };

  // 處理閱讀公告
  const handleReadNotice = async (noticeId) => {
    try {
      // 先在介面上標記為已讀
      setNotices(prevNotices => 
        prevNotices.map(notice => 
          notice.id === noticeId 
            ? { ...notice, is_read: true } 
            : notice
        )
      );
      
      // 呼叫 API 標記為已讀
      await markNoticeAsRead(noticeId);
      
      // 通知父組件更新未讀數量
      if (onNoticeRead) {
        onNoticeRead();
      }
    } catch (err) {
      console.error('標記公告已讀失敗:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-4 ${preview ? 'text-gray-300' : 'text-gray-300'}`}>
        <p>{error}</p>
      </div>
    );
  }

  // 如果是預覽模式，只顯示指定數量
  const displayNotices = preview ? notices.slice(0, limit) : notices;

  const isNoticesPage = location.pathname === '/notices';

  return (
    <div className={`${preview ? "" : "min-h-screen bg-gray-900 text-gray-100"} px-4 py-6 sm:px-6`}>
      {(!preview && isNoticesPage) && (
        <div className="mb-6 flex items-center">
          <Button 
            onClick={handleGoBack}
            variant="secondary"
            className="flex items-center text-sm mr-4 text-gray-300 hover:text-gray-100"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-1" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
                clipRule="evenodd" 
              />
            </svg>
            返回
          </Button>
          <h1 className="text-2xl font-bold text-gray-100">公告欄</h1>
        </div>
      )}
      
      {displayNotices.length === 0 ? (
        <p className={`text-center ${preview ? 'text-gray-400' : 'text-gray-400'}`}>
          目前沒有公告
        </p>
      ) : (
        <div className="space-y-4">
          {displayNotices.map(notice => (
            <Card 
              key={notice.id} 
              className={`p-4 cursor-pointer transition-all duration-200 rounded-lg shadow-lg
                ${notice.is_read 
                  ? 'bg-gray-800 hover:bg-gray-700' 
                  : 'bg-gray-700 hover:bg-gray-600 border-l-4 border-blue-400'}
                sm:p-6
              `}
              onClick={() => handleReadNotice(notice.id)}
            >
              <div className="flex justify-between items-start flex-wrap gap-2 sm:flex-nowrap">
                <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-100 flex-grow">
                  {!notice.is_read && (
                    <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  )}
                  {notice.title}
                </h2>
                {!notice.is_read && (
                  <span 
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded cursor-pointer hover:bg-blue-600 whitespace-nowrap"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReadNotice(notice.id);
                    }}
                    title="點擊標記為已讀"
                  >
                    未讀
                  </span>
                )}
              </div>
              
              <p className="text-gray-300 text-sm sm:text-base">
                {preview 
                  ? notice.content.length > 100 
                    ? `${notice.content.substring(0, 100)}...` 
                    : notice.content
                  : notice.content
                }
              </p>
              <div className="text-xs sm:text-sm text-gray-400 mt-2">
                {new Date(notice.created_at).toLocaleDateString()}
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {preview && showViewAll && notices.length > limit && (
        <div className="mt-4 text-center">
          <Button
            variant="link"
            onClick={() => navigate('/notices')}
            className="text-blue-400 hover:text-blue-300 text-sm sm:text-base"
          >
            查看全部公告
          </Button>
        </div>
      )}
    </div>
  );
};

export default NoticeBoard;