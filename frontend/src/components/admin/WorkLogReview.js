// 位置：frontend/src/components/admin/WorkLogReview.js

import React, { useState, useEffect } from 'react';
import { Button } from '../ui';
import { searchWorkLogs, reviewWorkLog, checkServerHealth } from '../../utils/api';
import ApiDiagnostic from '../common/ApiDiagnostic';
import AdminDiagnostic from './AdminDiagnostic';


const WorkLogReview = () => {
  const [workLogs, setWorkLogs] = useState([]);
  const [groupedWorkLogs, setGroupedWorkLogs] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [filter, setFilter] = useState({
    status: 'pending',
    date: new Date().toISOString().split('T')[0] // 預設為今天日期
  });
  const [serverStatus, setServerStatus] = useState({ status: 'unknown', message: '檢查連線中...' });
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);



  // 檢查伺服器連線狀態
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await checkServerHealth();
        setServerStatus(status);
        console.log('伺服器狀態檢查結果:', status);
      } catch (err) {
        console.error('檢查伺服器狀態失敗:', err);
        setServerStatus({ status: 'offline', message: '無法連線到伺服器' });
      }
    };
    
    checkConnection();
    // 每30秒檢查一次
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // 返回函數
  const handleGoBack = () => {
    window.history.back();
  };


// 載入工作日誌
useEffect(() => {
  const loadWorkLogs = async () => {
    // 重置狀態
    setIsLoading(true);
    setError(null);
    setWorkLogs([]);
    setGroupedWorkLogs({});

    try {
      // 日期處理：確保使用當天日期，並格式化為 YYYY-MM-DD
      const dateObj = filter.date ? new Date(filter.date) : new Date();
      const formattedDate = dateObj.toISOString().split('T')[0];
      
      // 預設狀態為 'pending'
      const status = filter.status || 'pending';

      // 詳細的日誌記錄
      console.log('工作日誌查詢參數:', {
        status,
        startDate: formattedDate,
        endDate: formattedDate
      });
      
      // 發送請求，增加超時和錯誤處理
      const data = await searchWorkLogs({
        status,
        startDate: formattedDate,
        endDate: formattedDate
      });
      
      // 數據驗證
      if (!data || (!Array.isArray(data) && !Array.isArray(data.data))) {
        throw new Error('無效的工作日誌數據格式');
      }

      // 處理不同的響應格式
      const workLogsData = Array.isArray(data) ? data : data.data;

      if (workLogsData.length === 0) {
        console.warn('未找到符合條件的工作日誌');
        setWorkLogs([]);
        setGroupedWorkLogs({});
        return;
      }

      // 詳細日誌
      console.log(`成功載入 ${workLogsData.length} 條工作日誌`);

      // 設置工作日誌
      setWorkLogs(workLogsData);
      
      // 按使用者和日期分組
      const grouped = groupWorkLogsByUserAndDate(workLogsData);
      setGroupedWorkLogs(grouped);
      
      // 初始化展開狀態
      const initialExpandState = Object.keys(grouped).reduce((acc, key) => {
        acc[key] = true; // 預設展開所有組
        return acc;
      }, {});
      setExpandedGroups(initialExpandState);

    } catch (err) {
      // 詳細的錯誤處理和日誌記錄
      console.error('載入工作日誌失敗:', {
        errorMessage: err.message,
        errorCode: err.code,
        requestParams: {
          status: filter.status,
          date: filter.date
        }
      });

      // 根據不同錯誤類型設置不同的錯誤訊息
      let errorMessage = '載入工作日誌失敗';
      
      if (err.response) {
        // API 返回的錯誤
        switch (err.response.status) {
          case 403:
            errorMessage = '您沒有權限查看工作日誌';
            break;
          case 401:
            errorMessage = '登入狀態已過期，請重新登入';
            break;
          case 500:
            errorMessage = '伺服器內部錯誤，請稍後再試';
            break;
          default:
            errorMessage = err.response.data?.message || errorMessage;
        }
      } else if (!navigator.onLine) {
        // 網路連線問題
        errorMessage = '網路連線已斷開，請檢查您的網路';
      }

      setError(errorMessage);
      
      // 重置數據
      setWorkLogs([]);
      setGroupedWorkLogs({});
      setExpandedGroups({});

    } finally {
      // 確保載入狀態被重置
      setIsLoading(false);
    }
  };

  // 只有在某些關鍵參數變化時才觸發
  if (filter.date || filter.status) {
    loadWorkLogs();
  }
}, [
  filter.date, 
  filter.status
]);

  // 將工作日誌按使用者和日期分組
  const groupWorkLogsByUserAndDate = (logs) => {
    const grouped = {};
    
    logs.forEach(log => {
      // 使用創建日期作為日期標識
      const date = new Date(log.created_at).toLocaleDateString();
      const groupKey = `${log.user_id}_${date}`;
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          userId: log.user_id,
          username: log.username || log.user_full_name || '未知使用者',
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

  // 審核工作日誌
  const handleReviewWorkLog = async (workLogId, status) => {
    try {
      setIsLoading(true);
      console.log(`審核工作日誌 ${workLogId}, 狀態設為 ${status}`);
      
      await reviewWorkLog(workLogId, status);
      
      // 更新本地狀態 - 移除已審核的日誌
      const updatedWorkLogs = workLogs.filter(log => log.id !== workLogId);
      setWorkLogs(updatedWorkLogs);
      
      // 重新分組更新後的工作日誌
      const updatedGrouped = groupWorkLogsByUserAndDate(updatedWorkLogs);
      setGroupedWorkLogs(updatedGrouped);
      
      setError(null);
      setIsLoading(false);
    } catch (err) {
      console.error('審核工作日誌失敗:', err);
      setError('審核工作日誌失敗，請稍後再試');
      setIsLoading(false);
    }
  };

  // 批量審核同一組的所有工作日誌
  const handleBatchReview = async (groupKey, status) => {
    try {
      setIsLoading(true);
      console.log(`批量審核組 ${groupKey}, 狀態設為 ${status}`);
      
      const group = groupedWorkLogs[groupKey];
      
      // 依次審核該組中的所有工作日誌
      const promises = group.logs.map(log => reviewWorkLog(log.id, status));
      await Promise.all(promises);
      
      // 更新本地狀態 - 移除已審核的組
      const updatedWorkLogs = workLogs.filter(log => {
        const logDate = new Date(log.created_at).toLocaleDateString();
        const logGroupKey = `${log.user_id}_${logDate}`;
        return logGroupKey !== groupKey;
      });
      
      setWorkLogs(updatedWorkLogs);
      
      // 重新分組更新後的工作日誌
      const updatedGrouped = groupWorkLogsByUserAndDate(updatedWorkLogs);
      setGroupedWorkLogs(updatedGrouped);
      
      setError(null);
      setIsLoading(false);
    } catch (err) {
      console.error('批量審核工作日誌失敗:', err);
      setError('批量審核工作日誌失敗，請稍後再試');
      setIsLoading(false);
    }
  };

  // 重新整理工作日誌
  const handleRefresh = () => {
    // 強制清除快取重新載入
    setFilter(prev => ({...prev})); // 觸發useEffect重載
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

      {/* 伺服器連線狀態 */}
      {serverStatus.status !== 'online' && (
        <div className={`mb-4 p-3 rounded-lg text-center ${
          serverStatus.status === 'offline' ? 'bg-red-700' : 'bg-yellow-700'
        }`}>
          <p className="font-medium">{serverStatus.message}</p>
          {serverStatus.status === 'offline' && (
            <p className="text-sm mt-1">請檢查網路連線或聯絡系統管理員</p>
          )}
        </div>
      )}

{error && (
  <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
    <p className="mb-2">{error}</p>
    <div className="flex justify-between items-center">
      <Button 
        onClick={handleRefresh}
        variant="secondary"
        className="text-sm mr-2"
      >
        重新整理
      </Button>
      <Button 
        onClick={() => setShowDiagnostic(true)}
        variant="secondary"
        className="text-sm"
      >
        診斷問題
      </Button>
    </div>
  </div>
)}


{/* 篩選器 - 修改為單一日期 */}
<div className="bg-gray-800 p-4 rounded-lg mb-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block mb-2">狀態</label>
      <select
        value={filter.status}
        onChange={(e) => setFilter({...filter, status: e.target.value})}
        className="w-full bg-gray-700 text-white p-2 rounded-lg"
      >
        <option value="pending">待審核</option>
        <option value="approved">已核准</option>
        <option value="rejected">已拒絕</option>
      </select>
    </div>
    <div>
      <label className="block mb-2">日期</label>
      <input
        type="date"
        value={filter.date}
        onChange={(e) => setFilter({...filter, date: e.target.value})}
        className="w-full bg-gray-700 text-white p-2 rounded-lg"
      />
    </div>
  </div>

        <div className="mt-4 flex justify-end">
          <Button 
            onClick={handleRefresh}
            className="bg-green-600 hover:bg-green-700"
          >
            重新整理
          </Button>
        </div>
      </div>

      {/* 分組顯示的工作日誌 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        {Object.keys(groupedWorkLogs).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">該日期沒有符合條件的工作日誌</p>
            {debugInfo && (
              <div className="mt-4 p-3 bg-gray-700 rounded-lg text-left text-xs text-gray-300">
                <h3 className="font-semibold mb-1">診斷資訊:</h3>
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}
          </div>
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
                    <button className="text-blue-400">
                      {expandedGroups[groupKey] ? '收起' : '展開'}
                    </button>
                    {filter.status === 'pending' && (
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
                            <td className="p-3 space-x-2">
                              {filter.status === 'pending' && (
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

      {/* 診斷工具彈窗 */}
      {showDiagnostic && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="w-full max-w-3xl">
    <AdminDiagnostic onClose={() => setShowDiagnostic(false)} />
        </div>
        </div>
      )}
    </div>
  );
};

export default WorkLogReview;