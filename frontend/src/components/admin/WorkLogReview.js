// 位置：frontend/src/components/admin/WorkLogReview.js
import React, { useState, useEffect } from 'react';
import { Button } from '../ui';
import { searchWorkLogs, reviewWorkLog } from '../../utils/api';
import UserDailyWorkLogs from '../worklog/UserDailyWorkLogs';

const WorkLogReview = () => {
  const [allWorkLogs, setAllWorkLogs] = useState([]); // 儲存所有工作日誌
  const [filteredWorkLogs, setFilteredWorkLogs] = useState([]); // 儲存篩選後的工作日誌
  const [groupedWorkLogs, setGroupedWorkLogs] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [filter, setFilter] = useState({
    status: 'pending',
    date: new Date().toISOString().split('T')[0], // 預設為今天日期
    userId: '' // 新增使用者ID篩選
  });
  const [selectedUserLog, setSelectedUserLog] = useState(null);
  const [showUserLogDetails, setShowUserLogDetails] = useState(false);
  const [users, setUsers] = useState([]); // 存儲所有使用者列表，用於下拉選單

  // 返回函數
  const handleGoBack = () => {
    window.history.back();
  };

  // 載入所有工作日誌
  useEffect(() => {
    const loadAllWorkLogs = async () => {
      try {
        setIsLoading(true);
        // 這裡使用 searchWorkLogs 但不傳入任何過濾條件，讓它返回所有數據
        // 如果後端有專門的API端點獲取所有工作日誌，可以在api.js添加對應函數並使用
        const data = await searchWorkLogs({});
        setAllWorkLogs(data);
        
        // 從所有工作日誌中提取不重複的使用者列表
        const uniqueUsers = [];
        const userMap = {};
        
        data.forEach(log => {
          if (log.user_id && !userMap[log.user_id]) {
            userMap[log.user_id] = true;
            uniqueUsers.push({
              id: log.user_id,
              username: log.username || '未知使用者'
            });
          }
        });
        
        setUsers(uniqueUsers);
        
        // 應用初始篩選
        applyFilters(data);
        setIsLoading(false);
      } catch (err) {
        setError('載入工作日誌失敗');
        setIsLoading(false);
      }
    };

    loadAllWorkLogs();
  }, []); // 只在組件掛載時載入一次

  // 應用篩選邏輯
  const applyFilters = (logs = allWorkLogs) => {
    if (!Array.isArray(logs) || logs.length === 0) return;
    
    const filtered = logs.filter(log => {
      // 狀態篩選
      if (filter.status && log.status !== filter.status) {
        return false;
      }
      
      // 日期篩選
      if (filter.date) {
        const logDate = new Date(log.created_at).toISOString().split('T')[0];
        if (logDate !== filter.date) {
          return false;
        }
      }
      
      // 使用者ID篩選
      if (filter.userId && log.user_id !== filter.userId) {
        return false;
      }
      
      return true;
    });
    
    setFilteredWorkLogs(filtered);
    
    // 將篩選後的工作日誌按使用者和日期分組
    const grouped = groupWorkLogsByUserAndDate(filtered);
    setGroupedWorkLogs(grouped);
    
    // 初始化展開狀態
    const initialExpandState = {};
    Object.keys(grouped).forEach(key => {
      initialExpandState[key] = true; // 預設展開所有組
    });
    setExpandedGroups(initialExpandState);
  };

  // 當篩選條件改變時應用篩選
  useEffect(() => {
    applyFilters();
  }, [filter]); // 篩選條件改變時重新篩選

  // 將工作日誌按使用者和日期分組
  const groupWorkLogsByUserAndDate = (logs) => {
    const grouped = {};
    
    logs.forEach(log => {
      // 從日期獲取年月日部分作為分組的一部分
      const date = new Date(log.created_at).toLocaleDateString();
      // 創建唯一的分組鍵 (使用者ID + 日期)
      const groupKey = `${log.user_id}_${date}`;
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          userId: log.user_id,
          username: log.username || '未知使用者',
          date: date,
          logs: []
        };
      }
      
      grouped[groupKey].logs.push(log);
    });
    
    return grouped;
  };

  // 切換分組的展開/折疊狀態
  const toggleGroupExpand = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // 格式化時間：只顯示 HH:MM
  const formatTime = (timeString) => {
    if (!timeString) return '';
    // 如果時間格式已經是 HH:MM，直接返回
    if (timeString.length === 5 && timeString.includes(':')) {
      return timeString;
    }
    // 否則嘗試提取 HH:MM 部分
    return timeString.substring(0, 5);
  };

  // 審核工作日誌 - 修改為更新本地狀態而不是移除
  const handleReviewWorkLog = async (workLogId, status) => {
    try {
      await reviewWorkLog(workLogId, status);
      
      // 更新本地狀態 - 修改審核狀態而不是移除
      const updatedAllLogs = allWorkLogs.map(log => 
        log.id === workLogId ? { ...log, status } : log
      );
      
      setAllWorkLogs(updatedAllLogs);
      
      // 重新應用篩選
      applyFilters(updatedAllLogs);
      
      setError(null);
    } catch (err) {
      setError('審核工作日誌失敗');
    }
  };

  // 批量審核同一組的所有工作日誌
  const handleBatchReview = async (groupKey, status) => {
    try {
      const group = groupedWorkLogs[groupKey];
      
      // 依次審核該組中的所有工作日誌
      for (const log of group.logs) {
        await reviewWorkLog(log.id, status);
      }
      
      // 更新本地狀態 - 修改審核狀態
      const updatedAllLogs = allWorkLogs.map(log => {
        const logDate = new Date(log.created_at).toLocaleDateString();
        const logGroupKey = `${log.user_id}_${logDate}`;
        
        if (logGroupKey === groupKey) {
          return { ...log, status };
        }
        return log;
      });
      
      setAllWorkLogs(updatedAllLogs);
      
      // 重新應用篩選
      applyFilters(updatedAllLogs);
      
      setError(null);
    } catch (err) {
      setError('批量審核工作日誌失敗');
    }
  };

  // 處理篩選條件變更
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 處理查看用戶日誌詳情
  const handleViewUserLogs = (userId, date) => {
    setSelectedUserLog({ userId, date });
    setShowUserLogDetails(true);
  };

  // 關閉用戶日誌詳情彈窗
  const handleCloseUserLogDetails = () => {
    setShowUserLogDetails(false);
    setSelectedUserLog(null);
  };

  // 重置篩選條件
  const handleResetFilters = () => {
    setFilter({
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      userId: ''
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white p-6">
      {/* 添加返回按鈕 */}
      <div className="mb-4">
        <Button 
          onClick={handleGoBack}
          variant="secondary"
          className="flex items-center text-sm"
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
      </div>
    
      <h1 className="text-2xl font-bold mb-6">工作日誌審核</h1>

      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* 擴展篩選器 - 添加使用者選單 */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2">狀態</label>
            <select
              name="status"
              value={filter.status}
              onChange={handleFilterChange}
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            >
              <option value="">全部狀態</option>
              <option value="pending">待審核</option>
              <option value="approved">已核准</option>
              <option value="rejected">已拒絕</option>
            </select>
          </div>
          <div>
            <label className="block mb-2">日期</label>
            <input
              type="date"
              name="date"
              value={filter.date}
              onChange={handleFilterChange}
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            />
          </div>
          <div>
            <label className="block mb-2">使用者</label>
            <select
              name="userId"
              value={filter.userId}
              onChange={handleFilterChange}
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            >
              <option value="">全部使用者</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button 
            onClick={handleResetFilters}
            variant="secondary"
            className="mr-2"
          >
            重置篩選
          </Button>
          <div className="text-gray-300 flex items-center">
            共找到 {filteredWorkLogs.length} 筆工作日誌
          </div>
        </div>
      </div>

      {/* 分組顯示的工作日誌 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        {Object.keys(groupedWorkLogs).length === 0 ? (
          <p className="text-center text-gray-400">該日期沒有符合條件的工作日誌</p>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedWorkLogs).map(groupKey => (
              <div key={groupKey} className="border border-gray-700 rounded-lg overflow-hidden">
                {/* 分組標頭 */}
                <div 
                  className="bg-gray-700 p-4 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleGroupExpand(groupKey)}
                >
                  <div>
                    <h3 className="text-xl font-semibold">
                      {groupedWorkLogs[groupKey].username} - {groupedWorkLogs[groupKey].date}
                    </h3>
                    <p className="text-gray-400">
                      共 {groupedWorkLogs[groupKey].logs.length} 筆工作紀錄
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        const userId = groupedWorkLogs[groupKey].userId;
                        const dateStr = groupedWorkLogs[groupKey].date;
                        const dateParts = dateStr.split('/');
                        // 確保日期格式為 YYYY-MM-DD
                        const formattedDate = new Date(parseInt('20' + dateParts[2]), parseInt(dateParts[0]) - 1, parseInt(dateParts[1])).toISOString().split('T')[0];
                        handleViewUserLogs(userId, formattedDate);
                      }}
                      className="px-2 py-1 text-sm bg-blue-600 hover:bg-blue-700 mr-2"
                    >
                      查看日誌
                    </Button>
                    <button className="text-blue-400">
                      {expandedGroups[groupKey] ? '收起' : '展開'}
                    </button>
                    {/* 只對待審核的項目顯示批量審核按鈕 */}
                    {groupedWorkLogs[groupKey].logs.some(log => log.status === 'pending') && (
                      <div className="flex space-x-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBatchReview(groupKey, 'approved');
                          }}
                          className="px-2 py-1 text-sm"
                        >
                          全部核准
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBatchReview(groupKey, 'rejected');
                          }}
                          className="px-2 py-1 text-sm"
                        >
                          全部拒絕
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 分組內容 */}
                {expandedGroups[groupKey] && (
                  <div className="p-4">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-700">
                          <th className="p-3 text-left">時間</th>
                          <th className="p-3 text-left">地點</th>
                          <th className="p-3 text-left">工作類別</th>
                          <th className="p-3 text-left">工作內容</th>
                          <th className="p-3 text-left">狀態</th>
                          <th className="p-3 text-left">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedWorkLogs[groupKey].logs.map(log => (
                          <tr key={log.id} className="border-b border-gray-700">
                            <td className="p-3">
                              {formatTime(log.start_time)} - {formatTime(log.end_time)}
                            </td>
                            <td className="p-3">{log.position_name || log.location}</td>
                            <td className="p-3">{log.work_category_name || log.crop}</td>
                            <td className="p-3">
                              <div>
                                <p><strong>詳情:</strong> {log.details || '無'}</p>
                                {log.harvest_quantity > 0 && (
                                  <p><strong>採收量:</strong> {log.harvest_quantity} 台斤</p>
                                )}
                                {log.product_id && (
                                  <p><strong>使用產品:</strong> {log.product_name} ({log.product_quantity})</p>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              {log.status === 'pending' && (
                                <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">待審核</span>
                              )}
                              {log.status === 'approved' && (
                                <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">已核准</span>
                              )}
                              {log.status === 'rejected' && (
                                <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">已拒絕</span>
                              )}
                            </td>
                            <td className="p-3 space-x-2">
                              {log.status === 'pending' && (
                                <>
                                  <Button
                                    onClick={() => handleReviewWorkLog(log.id, 'approved')}
                                    className="px-2 py-1 text-sm"
                                  >
                                    核准
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    onClick={() => handleReviewWorkLog(log.id, 'rejected')}
                                    className="px-2 py-1 text-sm"
                                  >
                                    拒絕
                                  </Button>
                                </>
                              )}
                              {log.status !== 'pending' && (
                                <Button
                                  onClick={() => handleReviewWorkLog(log.id, 'pending')}
                                  variant="secondary"
                                  className="px-2 py-1 text-sm"
                                >
                                  重設為待審核
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 日誌詳情彈窗 */}
      {showUserLogDetails && selectedUserLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-5xl">
            <UserDailyWorkLogs 
              userId={selectedUserLog.userId}
              workDate={selectedUserLog.date}
              onClose={handleCloseUserLogDetails}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkLogReview;