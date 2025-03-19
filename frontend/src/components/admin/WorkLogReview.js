// 位置：frontend/src/components/admin/WorkLogReview.js
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui';
import { searchWorkLogs, reviewWorkLog } from '../../utils/api';

const WorkLogReview = () => {
  const [workLogs, setWorkLogs] = useState([]);
  const [groupedWorkLogs, setGroupedWorkLogs] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [processingLogIds, setProcessingLogIds] = useState([]); // 追蹤正在處理的工作日誌ID
  const [processingGroups, setProcessingGroups] = useState([]); // 追蹤正在處理的組
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [filter, setFilter] = useState({
    status: 'pending',
    date: new Date().toISOString().split('T')[0] // 預設為今天日期
  });

  // 返回函數
  const handleGoBack = () => {
    window.history.back();
  };

  // 自定義 API 調用超時處理和重試邏輯
  const safeApiCall = async (apiFunc, params, retryCount = 3, delayMs = 1000) => {
    let currentRetry = 0;
    while (currentRetry <= retryCount) {
      try {
        return await apiFunc(...params);
      } catch (err) {
        console.error(`API 調用失敗 (嘗試 ${currentRetry}/${retryCount})`, err);
        currentRetry++;
        
        if (currentRetry > retryCount) {
          throw err; // 超出重試次數，往上拋出錯誤
        }
        
        // 等待指定時間後重試
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  };

  // 載入工作日誌 - 改進版本
  const loadWorkLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('開始載入工作日誌，過濾條件:', filter);
      
      // 使用改進的安全 API 調用
      const data = await safeApiCall(searchWorkLogs, [filter], 3, 1500);
      
      // 確保返回數據是數組
      if (!Array.isArray(data)) {
        console.error('工作日誌數據格式不正確:', data);
        setWorkLogs([]);
        setGroupedWorkLogs({});
        setError('返回數據格式不正確，請聯絡系統管理員');
        setIsLoading(false);
        return;
      }
      
      // 標準化工作日誌數據
      const normalizedLogs = data.map(log => ({
        ...log,
        id: log.id || `temp-${Date.now()}-${Math.random()}`, // 確保每條記錄都有唯一ID
        user_id: log.user_id || 0,
        username: log.username || '未知用戶',
        start_time: log.start_time ? log.start_time.substring(0, 5) : log.start_time,
        end_time: log.end_time ? log.end_time.substring(0, 5) : log.end_time,
        created_at: log.created_at || new Date().toISOString()
      }));
      
      console.log(`成功載入 ${normalizedLogs.length} 條工作日誌`);
      setWorkLogs(normalizedLogs);
      
      // 將工作日誌按使用者和日期分組
      const grouped = groupWorkLogsByUserAndDate(normalizedLogs);
      setGroupedWorkLogs(grouped);
      
      // 初始化展開狀態
      const initialExpandState = {};
      Object.keys(grouped).forEach(key => {
        initialExpandState[key] = true; // 預設展開所有組
      });
      setExpandedGroups(initialExpandState);
      
    } catch (err) {
      console.error('載入工作日誌失敗:', err);
      setError(`載入工作日誌失敗: ${err.message || '未知錯誤'}`);
      setWorkLogs([]);
      setGroupedWorkLogs({});
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  // 將工作日誌按使用者和日期分組
  const groupWorkLogsByUserAndDate = (logs) => {
    if (!Array.isArray(logs) || logs.length === 0) {
      return {};
    }
    
    const grouped = {};
    
    logs.forEach(log => {
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
        console.error('分組工作日誌時發生錯誤:', err, 'Log:', log);
        // 繼續處理其他日誌，不中斷循環
      }
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
    try {
      return timeString.substring(0, 5);
    } catch (err) {
      console.warn('時間格式化失敗:', timeString);
      return timeString;
    }
  };

  // 改進的單條工作日誌審核函數
  const handleReviewWorkLog = async (workLogId, status) => {
    // 防止重複操作同一條日誌
    if (processingLogIds.includes(workLogId)) {
      console.log(`工作日誌 ${workLogId} 正在處理中，請稍候`);
      return;
    }
    
    // 添加到處理中列表
    setProcessingLogIds(prev => [...prev, workLogId]);
    setError(null);
    
    try {
      console.log(`開始審核工作日誌 ${workLogId}, 狀態: ${status}`);
      
      // 使用改進的安全 API 調用
      await safeApiCall(reviewWorkLog, [workLogId, status], 2, 1000);
      
      console.log(`工作日誌 ${workLogId} 審核成功`);
      
      // 更新本地狀態 - 移除已審核的日誌
      setWorkLogs(prev => prev.filter(log => log.id !== workLogId));
      
      // 並重新計算分組數據
      setGroupedWorkLogs(prev => {
        // 找出日誌所屬的組並移除該日誌
        const newGrouped = {...prev};
        
        // 遍歷每個組，檢查並移除日誌
        Object.keys(newGrouped).forEach(groupKey => {
          const group = newGrouped[groupKey];
          const updatedLogs = group.logs.filter(log => log.id !== workLogId);
          
          if (updatedLogs.length === 0) {
            // 如果組內沒有日誌了，刪除整個組
            delete newGrouped[groupKey];
          } else {
            // 否則更新組內的日誌列表
            newGrouped[groupKey] = {
              ...group,
              logs: updatedLogs
            };
          }
        });
        
        return newGrouped;
      });
      
    } catch (err) {
      console.error(`審核工作日誌 ${workLogId} 失敗:`, err);
      setError(`審核工作日誌失敗: ${err.message || '未知錯誤'}`);
    } finally {
      // 從處理中列表移除
      setProcessingLogIds(prev => prev.filter(id => id !== workLogId));
    }
  };

  // 改進的批量審核函數 - 並行處理
  const handleBatchReview = async (groupKey, status) => {
    // 防止重複操作同一組
    if (processingGroups.includes(groupKey)) {
      console.log(`組 ${groupKey} 正在處理中，請稍候`);
      return;
    }
    
    // 添加到處理中組列表
    setProcessingGroups(prev => [...prev, groupKey]);
    setError(null);
    
    try {
      const group = groupedWorkLogs[groupKey];
      if (!group || !Array.isArray(group.logs) || group.logs.length === 0) {
        console.warn(`無法找到組 ${groupKey} 或組內沒有日誌`);
        return;
      }
      
      console.log(`開始批量審核組 ${groupKey}, 共 ${group.logs.length} 條日誌, 狀態: ${status}`);
      
      // 創建批量審核任務，但使用 Promise.all 並行處理
      const batchPromises = group.logs.map(log => {
        // 添加到處理中ID列表
        setProcessingLogIds(prev => [...prev, log.id]);
        
        // 返回審核 Promise
        return safeApiCall(reviewWorkLog, [log.id, status], 2, 1000)
          .catch(err => {
            console.error(`批量審核中的日誌 ${log.id} 失敗:`, err);
            return { error: true, logId: log.id, message: err.message };
          })
          .finally(() => {
            // 從處理中ID列表移除
            setProcessingLogIds(prev => prev.filter(id => id !== log.id));
          });
      });
      
      // 等待所有審核任務完成
      const results = await Promise.all(batchPromises);
      
      // 檢查結果，看是否有失敗的審核
      const failures = results.filter(r => r && r.error);
      if (failures.length > 0) {
        console.warn(`批量審核中有 ${failures.length} 條日誌失敗`);
        setError(`批量審核部分失敗: ${failures.length} 條日誌未審核成功`);
      } else {
        console.log(`組 ${groupKey} 的所有日誌審核成功`);
      }
      
      // 更新本地狀態 - 移除整個組
      setGroupedWorkLogs(prev => {
        const newGrouped = {...prev};
        delete newGrouped[groupKey];
        return newGrouped;
      });
      
      // 更新工作日誌列表
      setWorkLogs(prev => prev.filter(log => {
        try {
          const logDate = new Date(log.created_at).toLocaleDateString();
          const logGroupKey = `${log.user_id}_${logDate}`;
          return logGroupKey !== groupKey;
        } catch (err) {
          console.warn('過濾工作日誌時出錯:', err);
          return true; // 保留無法判斷組的日誌
        }
      }));
      
    } catch (err) {
      console.error(`批量審核組 ${groupKey} 失敗:`, err);
      setError(`批量審核失敗: ${err.message || '未知錯誤'}`);
    } finally {
      // 從處理中組列表移除
      setProcessingGroups(prev => prev.filter(key => key !== groupKey));
    }
  };

  // 初始化時載入日誌
  useEffect(() => {
    loadWorkLogs();
  }, [loadWorkLogs]);

  // 當過濾條件變化時重新載入
  useEffect(() => {
    loadWorkLogs();
  }, [filter, loadWorkLogs]);

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

      {/* 錯誤提示 */}
      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="text-white hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* 篩選器 */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2">狀態</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({...filter, status: e.target.value})}
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-between">
          <div>
            {/* 顯示日誌數量 */}
            <span className="text-sm text-gray-400">
              共找到 {Object.keys(groupedWorkLogs).length} 組，
              {workLogs.length} 條日誌
            </span>
          </div>
          <Button 
            onClick={loadWorkLogs}
            className="bg-green-600 hover:bg-green-700"
            disabled={isLoading}
          >
            {isLoading ? '載入中...' : '重新整理'}
          </Button>
        </div>
      </div>

      {/* 載入中指示器 */}
      {isLoading && (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* 分組顯示的工作日誌 */}
      {!isLoading && (
        <div className="bg-gray-800 p-6 rounded-lg">
          {Object.keys(groupedWorkLogs).length === 0 ? (
            <p className="text-center text-gray-400">該日期沒有符合條件的工作日誌</p>
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedWorkLogs).map(groupKey => {
                const group = groupedWorkLogs[groupKey];
                const isProcessingGroup = processingGroups.includes(groupKey);
                
                return (
                  <div key={groupKey} className="border border-gray-700 rounded-lg overflow-hidden">
                    {/* 分組標頭 */}
                    <div 
                      className={`p-4 flex justify-between items-center cursor-pointer
                        ${isProcessingGroup ? 'bg-blue-900' : 'bg-gray-700'}`}
                      onClick={() => toggleGroupExpand(groupKey)}
                    >
                      <div>
                        <h3 className="text-xl font-semibold">
                          {group.username} - {group.date}
                        </h3>
                        <p className="text-gray-400">
                          共 {group.logs.length} 筆工作紀錄
                          {isProcessingGroup && ' - 處理中...'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-blue-400">
                          {expandedGroups[groupKey] ? '收起' : '展開'}
                        </button>
                        {filter.status === 'pending' && !isProcessingGroup && (
                          <div className="flex space-x-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBatchReview(groupKey, 'approved');
                              }}
                              className="px-2 py-1 text-sm"
                              disabled={isProcessingGroup}
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
                              disabled={isProcessingGroup}
                            >
                              全部拒絕
                            </Button>
                          </div>
                        )}
                        {isProcessingGroup && (
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
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
                            {group.logs.map(log => {
                              const isProcessing = processingLogIds.includes(log.id);
                              
                              return (
                                <tr key={log.id} className={`border-b border-gray-700 ${
                                  isProcessing ? 'bg-blue-900 bg-opacity-50' : ''
                                }`}>
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
                                        {isProcessing ? (
                                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                                        ) : (
                                          <>
                                            <Button
                                              onClick={() => handleReviewWorkLog(log.id, 'approved')}
                                              className="px-2 py-1 text-sm"
                                              disabled={isProcessing || isProcessingGroup}
                                            >
                                              核准
                                            </Button>
                                            <Button
                                              variant="secondary"
                                              onClick={() => handleReviewWorkLog(log.id, 'rejected')}
                                              className="px-2 py-1 text-sm"
                                              disabled={isProcessing || isProcessingGroup}
                                            >
                                              拒絕
                                            </Button>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkLogReview;