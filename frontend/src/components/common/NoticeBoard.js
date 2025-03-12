// 位置：frontend/src/components/common/NoticeBoard.js
import React, { useState, useEffect } from 'react';
import { fetchNotices, markNoticeAsRead } from '../../utils/api';
import { Card } from '../ui';

const NoticeBoard = ({ preview = false, onNoticeRead }) => {
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
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-white flex items-center justify-center p-4">
        <p>{error}</p>
      </div>
    );
  }

  // 如果是預覽模式，只顯示前3條
  const displayNotices = preview ? notices.slice(0, 3) : notices;

  return (
    <div className={preview ? "" : "min-h-screen bg-gray-900 text-white p-6"}>
      {!preview && <h1 className="text-2xl font-bold mb-6">公告欄</h1>}
      
      {displayNotices.length === 0 ? (
        <p className="text-gray-400">目前沒有公告</p>
      ) : (
        <div className="space-y-4">
          {displayNotices.map(notice => (
            <Card 
              key={notice.id} 
              className={`p-4 cursor-pointer transition-all duration-200 
                ${notice.is_read ? 'bg-gray-800' : 'bg-gray-700 border-l-4 border-blue-500'}
              `}
              onClick={() => !notice.is_read && handleReadNotice(notice.id)}
            >
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-semibold mb-2">
                  {!notice.is_read && (
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  )}
                  {notice.title}
                </h2>
                {!notice.is_read && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                    未讀
                  </span>
                )}
              </div>
              
              <p className="text-gray-300">
                {preview 
                  ? notice.content.length > 100 
                    ? `${notice.content.substring(0, 100)}...` 
                    : notice.content
                  : notice.content
                }
              </p>
              <div className="text-sm text-gray-500 mt-2">
                {new Date(notice.created_at).toLocaleDateString()}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoticeBoard;