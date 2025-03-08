// 位置：frontend/src/components/common/NoticeBoard.js
import React, { useState, useEffect } from 'react';
import { fetchNotices } from '../../utils/api';

const NoticeBoard = ({ preview = false }) => {
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
            <div 
              key={notice.id} 
              className="bg-gray-800 p-4 rounded-lg shadow-md"
            >
              <h2 className="text-xl font-semibold mb-2">{notice.title}</h2>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoticeBoard;