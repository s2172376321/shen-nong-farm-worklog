// 位置：frontend/src/components/admin/WorkLogReview.js
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui';
import { searchWorkLogs, reviewWorkLog } from '../../utils/api';

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
  const [refreshTrigger, setRefreshTrigger] = useState(0); // 添加刷新觸發器

  // 返回函數
  const handleGoBack = () => {
    window.history.back();
  };

  // 將工作日誌按使用者和日期分組
  const groupWorkLogsByUserAndDate = useCallback((logs) => {
    if (!Array.isArray(logs)) {
      console.error('嘗試分組非數組數據:', logs);
      return {};
    }
    
    const grouped = {};
    
    logs.forEach(log => {
      if (!log.created_at || !log.user_id) {
        console.warn('日誌缺少必要屬性:', log);
        return;
      }
      
      try {
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
      } catch (err) {
        console.error('分組過程中出錯:', err, log);
      }
    });
    
    return grouped;
  }, []);

  // 刷新數據的函數
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('開始加載工作日誌，過濾條件:', filter);
      
      // 使用 AbortController 處理請求取消
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超時
      
      const data = await searchWorkLogs({
        ...filter,
        forceRefresh: refreshTrigger // 加入強制刷新標記
      });
      
      clearTimeout(timeoutId);
      
      // 確保數據為數組
      if (!Array.isArray(data)) {
        console.error('返回的數據格式不正確:', data);
        throw new Error('返回的數據格式不正確');
      }
      
      console.log(`成功載入 ${data.length} 條工作日誌`);
      
      // 設置工作日誌數據
      setWorkLogs(data);
      
      // 分組日誌數據
      const grouped = groupWorkLogsByUserAndDate(data);
      setGroupedWorkLogs(grouped);
      
      // 初始化展開狀態
      const initialExpandState = {};
      Object.keys(grouped).forEach(key => {
        initialExpandState[key] = true;
      });
      setExpandedGroups(initialExpandState);
      
      setError(null);
    } catch (err) {
      console.error('加載工作日誌失敗:', err);
      
      // 提供更詳細的錯誤信息
      if (err.name === 'AbortError') {
        setError('請求超時，請稍後再試');
      } else if (err.response) {
        setError(`伺服器錯誤 (${err.response.status}): ${err.response.data?.message || '未知錯誤'}`);
      } else if (err.request) {
        setError('無法連接到伺服器，請檢查網絡連接');
      } else {
        setError(`載入工作日誌失敗: ${err.message}`);
      }
      
      // 設置空數據，避免 UI 崩潰
      setWorkLogs([]);
      setGroupedWorkLogs({});
    } finally {
      // 確保在任何情況下都將 loading 狀態設為 false
      setIsLoading(false);
    }
  }, [filter, refreshTrigger, groupWorkLogsByUserAndDate]);

  // 載入工作日誌
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // 觸發刷新
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
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
      await reviewWorkLog(workLogId, status);
      
      // 更新本地狀態 - 移除已審核的日誌
      const updatedWorkLogs = workLogs.filter(log => log.id !== workLogId);
      setWorkLogs(updatedWorkLogs);
      
      // 重新分組更新後的工作日誌
      const updatedGrouped = groupWorkLogsByUserAndDate(updatedWorkLogs);
      setGroupedWorkLogs(updatedGrouped);
      
      setError(null);
      setIsLoading(false);
      
      // 觸發刷新
      handleRefresh();
    } catch (err) {
      console.error('審核工作日誌失敗:', err);
      setError('審核工作日誌失敗: ' + (err.message || '未知錯誤'));
      setIsLoading(false);
    }
  };

  // 批量審核同一組的所有工作日誌
  const handleBatchReview = async (groupKey, status) => {
    try {
      setIsLoading(true);
      const group = groupedWorkLogs[groupKey];
      
      if (!group || !Array.isArray(group.logs)) {
        throw new Error('找不到要審核的日誌組');
      }
      
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
      
      // 觸發刷新
      handleRefresh();
    } catch (err) {
      console.error('批量審核工作日誌失敗:', err);
      setError('批量審核工作日誌失敗: ' + (err.message || '未知錯誤'));
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-white text-lg">載入工作日誌中，請稍候...</p>
        {/* 添加超時自動重試功能 */}
        <div className="mt-8">
          <Button 
            onClick={handleRefresh}
            variant="secondary"
            className="text-sm"
          >
            載入時間過長？點擊重試
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white p-6">
      {/* 添加返回按鈕 */}
      <div className="mb-4 flex justify-between items-center">
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
        
        {/* 添加刷新按鈕 */}
        <Button 
          onClick={handleRefresh}
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
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" 
              clipRule="evenodd" 
            />
          </svg>
          刷新數據
        </Button>
      </div>
    
      <h1 className="text-2xl font-bold mb-6">工作日誌審核</h1>

      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <p>{error}</p>
            <Button 
              onClick={() => setError(null)}
              variant="secondary"
              className="text-sm px-2 py-1"
            >
              關閉
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
      </div>

      {/* 分組顯示的工作日誌 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        {Object.keys(groupedWorkLogs).length === 0 ? (
          <div className="text-center p-8">
            <p className="text-gray-400 mb-4">目前沒有待審核的工作日誌</p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">嘗試更改日期或狀態過濾器</p>
              <div className="flex justify-center space-x-4 mt-4">
                <Button
                  onClick={() => setFilter(prev => ({
                    ...prev,
                    date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0]
                  }))}
                >
                  查看昨天
                </Button>
                <Button
                  onClick={() => setFilter(prev => ({
                    ...prev,
                    status: prev.status === 'pending' ? 'approved' : 'pending'
                  }))}
                >
                  {filter.status === 'pending' ? '查看已核准' : '查看待審核'}
                </Button>
              </div>
            </div>
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
    </div>
  );
};

export default WorkLogReview;