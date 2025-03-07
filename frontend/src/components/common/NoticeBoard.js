// 位置：frontend/src/components/common/NoticeBoard.js
import React, { useState, useEffect } from 'react';
import { fetchNotices } from '../../utils/api';

const NoticeBoard = () => {
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">公告欄</h1>
      {notices.length === 0 ? (
        <p className="text-gray-400">目前沒有公告</p>
      ) : (
        <div className="space-y-4">
          {notices.map(notice => (
            <div 
              key={notice.id} 
              className="bg-gray-800 p-4 rounded-lg shadow-md"
            >
              <h2 className="text-xl font-semibold mb-2">{notice.title}</h2>
              <p className="text-gray-300">{notice.content}</p>
              <div className="text-sm text-gray-500 mt-2">
                {new Date(notice.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoticeBoard;