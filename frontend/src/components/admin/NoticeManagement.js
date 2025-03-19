// 位置：frontend/src/components/admin/NoticeManagement.js
import React, { useState, useEffect } from 'react';
import { fetchNotices, createNotice, updateNotice, deleteNotice } from '../../utils/api';
import { Button, Input } from '../ui';

const NoticeManagement = () => {
  const [notices, setNotices] = useState([]);
  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    expiresAt: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);

  // 載入公告列表
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

// 創建新公告
const handleCreateNotice = async (e) => {
  e.preventDefault();
  
  // 添加表單驗證
  if (!newNotice.title || !newNotice.content) {
    setError('標題和內容不能為空');
    return;
  }
  
  // 添加更多日誌以便調試
  console.log('提交新公告:', newNotice);
  
  try {
    // 創建一個新對象傳遞，避免任何引用問題
    const noticeToSubmit = {
      title: newNotice.title,
      content: newNotice.content,
      expiresAt: newNotice.expiresAt
    };
    
    const response = await createNotice(noticeToSubmit);
    console.log('公告創建成功:', response);
    
    // 更新公告列表
    setNotices([...notices, response]);
    setNewNotice({ title: '', content: '', expiresAt: '' });
    setError(null);
  } catch (err) {
    console.error('創建公告錯誤:', err);
    setError(err.response?.data?.message || err.message || '創建公告失敗');
  }
};




// 更新公告
  const handleUpdateNotice = async () => {
    if (!selectedNotice) return;
    try {
      const response = await updateNotice(selectedNotice.id, {
        title: selectedNotice.title,
        content: selectedNotice.content,
        expiresAt: selectedNotice.expires_at
      });
      setNotices(notices.map(n => n.id === selectedNotice.id ? response : n));
      setSelectedNotice(null);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || '更新公告失敗');
    }
  };

  // 刪除公告
  const handleDeleteNotice = async (noticeId) => {
    try {
      await deleteNotice(noticeId);
      setNotices(notices.filter(n => n.id !== noticeId));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || '刪除公告失敗');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">公告管理</h1>

      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* 新增/編輯公告表單 */}
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {selectedNotice ? '編輯公告' : '新增公告'}
        </h2>
        <form 
          onSubmit={selectedNotice ? handleUpdateNotice : handleCreateNotice} 
          className="space-y-4"
        >
          <Input
            type="text"
            placeholder="公告標題"
            value={selectedNotice ? selectedNotice.title : newNotice.title}
            onChange={(e) => 
              selectedNotice
                ? setSelectedNotice({...selectedNotice, title: e.target.value})
                : setNewNotice({...newNotice, title: e.target.value})
            }
            required
          />
          <textarea
            placeholder="公告內容"
            value={selectedNotice ? selectedNotice.content : newNotice.content}
            onChange={(e) => 
              selectedNotice
                ? setSelectedNotice({...selectedNotice, content: e.target.value})
                : setNewNotice({...newNotice, content: e.target.value})
            }
            className="w-full bg-gray-700 text-white p-2 rounded-lg h-32"
            required
          />
          <div>
            <label className="block mb-2">過期日期（可選）</label>
            <Input
              type="date"
              value={selectedNotice ? selectedNotice.expires_at : newNotice.expiresAt}
              onChange={(e) => 
                selectedNotice
                  ? setSelectedNotice({...selectedNotice, expires_at: e.target.value})
                  : setNewNotice({...newNotice, expiresAt: e.target.value})
              }
              className="w-full"
            />
          </div>
          <div className="flex space-x-4">
            <Button type="submit" className="w-full">
              {selectedNotice ? '更新' : '新增'}
            </Button>
            {selectedNotice && (
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setSelectedNotice(null)}
                className="w-full"
              >
                取消
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* 公告列表 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">公告列表</h2>
        {notices.length === 0 ? (
          <p className="text-center text-gray-400">目前沒有公告</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="p-3 text-left">標題</th>
                  <th className="p-3 text-left">內容</th>
                  <th className="p-3 text-left">建立日期</th>
                  <th className="p-3 text-left">過期日期</th>
                  <th className="p-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {notices.map(notice => (
                  <tr key={notice.id} className="border-b border-gray-700">
                    <td className="p-3">{notice.title}</td>
                    <td className="p-3 truncate max-w-xs">{notice.content}</td>
                    <td className="p-3">
                      {new Date(notice.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      {notice.expires_at 
                        ? new Date(notice.expires_at).toLocaleDateString() 
                        : '無'}
                    </td>
                    <td className="p-3 space-x-2">
                      <Button 
                        onClick={() => setSelectedNotice(notice)}
                        className="px-2 py-1 text-sm"
                      >
                        編輯
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="px-2 py-1 text-sm"
                      >
                        刪除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoticeManagement;