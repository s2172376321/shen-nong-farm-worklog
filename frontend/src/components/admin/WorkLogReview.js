// 位置：frontend/src/components/admin/WorkLogReview.js
import React, { useState, useEffect } from 'react';
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
    date: new Date().toISOString().split('T')[0], // 預設為今天日期
    dateRange: 'today', // 新增: 'today', 'week', 'month', 'custom'
    startDate: new Date().toISOString().split('T')[0], // 新增: 自訂起始日期
    endDate: new Date().toISOString().split('T')[0], // 新增: 自訂結束日期
    location: '', // 新增: 位置篩選
    crop: '', // 新增: 作物篩選
    userName: '', // 新增: 用戶名稱篩選
    timeRange: 'all' // 新增: 'all', 'morning', 'afternoon'
  });

  // 返回函數
  const handleGoBack = () => {
    window.history.back();
  };

  // 計算日期範圍
  const calculateDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (filter.dateRange) {
      case 'today':
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'week': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // 當週週日
        const endOfWeek = new Date(today);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // 當週週六
        return {
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: endOfWeek.toISOString().split('T')[0]
        };
      }
      case 'month': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: endOfMonth.toISOString().split('T')[0]
        };
      }
      case 'custom':
        return {
          startDate: filter.startDate,
          endDate: filter.endDate
        };
      default:
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
    }
  };

  // 載入工作日誌
  useEffect(() => {
    const loadWorkLogs = async () => {
      try {
        setIsLoading(true);
        
        // 計算日期範圍
        const dateRange = calculateDateRange();
        
        // 建立查詢參數
        const searchParams = {
          status: filter.status,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        };
        
        // 加入可選篩選條件
        if (filter.location) searchParams.location = filter.location;
        if (filter.crop) searchParams.crop = filter.crop;
        if (filter.userName) searchParams.userName = filter.userName;
        
        const data = await searchWorkLogs(searchParams);
        
        // 根據時段篩選 (上午/下午)
        let filteredData = [...data];
        if (filter.timeRange !== 'all') {
          filteredData = data.filter(log => {
            const hour = parseInt(log.start_time.split(':')[0], 10);
            if (filter.timeRange === 'morning') {
              return hour < 12; // 上午 (00:00-11:59)
            } else if (filter.timeRange === 'afternoon') {
              return hour >= 12; // 下午 (12:00-23:59)
            }
            return true;
          });
        }
        
        setWorkLogs(filteredData);
        
        // 將工作日誌按使用者和日期分組
        const grouped = groupWorkLogsByUserAndDate(filteredData);
        setGroupedWorkLogs(grouped);
        
        // 初始化展開狀態
        const initialExpandState = {};
        Object.keys(grouped).forEach(key => {
          initialExpandState[key] = true; // 預設展開所有組
        });
        setExpandedGroups(initialExpandState);
        
        setIsLoading(false);
      } catch (err) {
        console.error('載入工作日誌失敗:', err);
        setError('載入工作日誌失敗');
        setIsLoading(false);
      }
    };

    loadWorkLogs();
  }, [filter]);

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

  // 審核工作日誌
  const handleReviewWorkLog = async (workLogId, status) => {
    try {
      await reviewWorkLog(workLogId, status);
      
      // 更新本地狀態 - 移除已審核的日誌
      const updatedWorkLogs = workLogs.filter(log => log.id !== workLogId);
      setWorkLogs(updatedWorkLogs);
      
      // 重新分組更新後的工作日誌
      const updatedGrouped = groupWorkLogsByUserAndDate(updatedWorkLogs);
      setGroupedWorkLogs(updatedGrouped);
      
      setError(null);
    } catch (err) {
      console.error('審核工作日誌失敗:', err);
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
    } catch (err) {
      console.error('批量審核工作日誌失敗:', err);
      setError('批量審核工作日誌失敗');
    }
  };

  // 處理過濾條件變更
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    // 處理日期範圍選擇
    if (name === 'dateRange') {
      setFilter(prev => ({
        ...prev,
        dateRange: value,
        // 如果不是自訂範圍，就更新日期為當天
        ...(value !== 'custom' && { 
          date: new Date().toISOString().split('T')[0] 
        })
      }));
    } else {
      setFilter(prev => ({ ...prev, [name]: value }));
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

      {/* 增強的篩選器面板 */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">篩選條件</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 狀態篩選 */}
          <div>
            <label className="block mb-2">狀態</label>
            <select
              name="status"
              value={filter.status}
              onChange={handleFilterChange}
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            >
              <option value="pending">待審核</option>
              <option value="approved">已核准</option>
              <option value="rejected">已拒絕</option>
              <option value="">全部</option>
            </select>
          </div>
          
          {/* 日期範圍選擇 */}
          <div>
            <label className="block mb-2">日期範圍</label>
            <select
              name="dateRange"
              value={filter.dateRange}
              onChange={handleFilterChange}
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            >
              <option value="today">今天</option>
              <option value="week">本週</option>
              <option value="month">本月</option>
              <option value="custom">自訂範圍</option>
            </select>
          </div>
          
          {/* 時段篩選 */}
          <div>
            <label className="block mb-2">時段篩選</label>
            <select
              name="timeRange"
              value={filter.timeRange}
              onChange={handleFilterChange}
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            >
              <option value="all">全部時段</option>
              <option value="morning">上午 (00:00-11:59)</option>
              <option value="afternoon">下午 (12:00-23:59)</option>
            </select>
          </div>
          
          {/* 自訂日期範圍 - 只有在選擇自訂範圍時顯示 */}
          {filter.dateRange === 'custom' && (
            <>
              <div>
                <label className="block mb-2">開始日期</label>
                <input
                  type="date"
                  name="startDate"
                  value={filter.startDate}
                  onChange={handleFilterChange}
                  className="w-full bg-gray-700 text-white p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block mb-2">結束日期</label>
                <input
                  type="date"
                  name="endDate"
                  value={filter.endDate}
                  onChange={handleFilterChange}
                  className="w-full bg-gray-700 text-white p-2 rounded-lg"
                />
              </div>
            </>
          )}
          
          {/* 位置篩選 */}
          <div>
            <label className="block mb-2">位置</label>
            <input
              type="text"
              name="location"
              value={filter.location}
              onChange={handleFilterChange}
              placeholder="輸入位置關鍵字"
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            />
          </div>
          
          {/* 作物篩選 */}
          <div>
            <label className="block mb-2">作物/工作類別</label>
            <input
              type="text"
              name="crop"
              value={filter.crop}
              onChange={handleFilterChange}
              placeholder="輸入作物或工作類別關鍵字"
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            />
          </div>
          
          {/* 用戶名稱篩選 */}
          <div>
            <label className="block mb-2">使用者</label>
            <input
              type="text"
              name="userName"
              value={filter.userName}
              onChange={handleFilterChange}
              placeholder="輸入使用者名稱"
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 分組顯示的工作日誌 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        {Object.keys(groupedWorkLogs).length === 0 ? (
          <p className="text-center text-gray-400">沒有符合條件的工作日誌</p>
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