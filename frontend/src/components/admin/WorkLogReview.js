// 位置：frontend/src/components/admin/WorkLogReview.js
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui';
import { searchWorkLogs, reviewWorkLog, getApiStatus } from '../../utils/api';
import { useAuth } from '../../context/AuthContext'; // 添加 useAuth 引入
import ApiDiagnostic from '../common/ApiDiagnostic';

const WorkLogReview = () => {
  const { user } = useAuth(); // 使用 useAuth 獲取當前用戶
  const [workLogs, setWorkLogs] = useState([]);
  const [groupedWorkLogs, setGroupedWorkLogs] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showDiagnostic, setShowDiagnostic] = useState(false);

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
  
  const handleRetry = () => {
    // 清除快取（如果有使用快取）
    if (typeof window.clearApiCache === 'function') {
      window.clearApiCache('workLogs');
    }
    
    // 重新載入數據
    loadWorkLogs();
  };
  
  // 切換分組的展開/折疊狀態
  const toggleGroupExpand = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // 返回函數
  const handleGoBack = () => {
    window.history.back();
  };

  // 處理過濾器變更
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
    
    // 當主要過濾條件改變時，立即重新載入數據
    if (['status', 'dateRange', 'startDate', 'endDate'].includes(name)) {
      setTimeout(() => loadWorkLogs(), 100); // 稍微延遲以確保狀態更新
    }
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
  const loadWorkLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    

      // 添加認證檢查
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('認證令牌不存在');
    setError('您的登入狀態已失效，請重新登入');
    setIsLoading(false); // 確保設置 loading 狀態為 false
    return; // 提前退出函數
  }

    try {
      // 計算實際使用的過濾條件
      const dateRange = calculateDateRange();
      const filters = {
        status: filter.status,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        location: filter.location,
        crop: filter.crop,
        userName: filter.userName,
        timeRange: filter.timeRange
      };
      
      // 增加詳細的載入狀態日誌
      console.log('API 請求實際發送的參數:', {
        ...filters,
        dateRangeInfo: {
          calculated: dateRange,
          originalStartDate: filter.startDate,
          originalEndDate: filter.endDate
        },
        requestTime: new Date().toISOString()
      });
        
      // 在請求前添加測試代碼以檢查API是否可訪問
      try {
        const serverStatus = await getApiStatus();
        console.log('伺服器狀態檢查結果:', serverStatus);
      } catch (statusErr) {
        console.error('伺服器狀態檢查失敗:', statusErr);
      }
      
      const data = await searchWorkLogs(filters);
        
    // [添加位置 2] - 在這裡添加對 API 響應的詳細日誌
    console.log('API 響應詳細資訊:', {
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 'not an array',
      recordIds: Array.isArray(data) ? data.map(item => item.id) : [],
      sample: Array.isArray(data) && data.length > 0 ? JSON.stringify(data[0]).substring(0, 500) : null,
      responseTime: new Date().toISOString()
    });
    
    if (Array.isArray(data)) {
      setWorkLogs(data);
        
      // 將工作日誌按使用者和日期分組
      const grouped = groupWorkLogsByUserAndDate(data);
      setGroupedWorkLogs(grouped);
      
      // 初始化展開狀態
      const initialExpandState = {};
      Object.keys(grouped).forEach(key => {
        initialExpandState[key] = true; // 預設展開所有組
      });
      setExpandedGroups(initialExpandState);
      
      console.log(`成功載入並分組 ${Object.keys(grouped).length} 組工作日誌`);
    } else {
      console.error('API返回了非數組數據:', data);
      setWorkLogs([]);
      setGroupedWorkLogs({});
      setError('返回數據格式不正確，請聯繫系統管理員');
      }
    } catch (err) {
      console.error('載入工作日誌詳細錯誤:', {
        message: err.message,
        userMessage: err.userMessage,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          headers: err.config?.headers ? '存在' : '不存在'
        }
      });
      
      // 提供更有用的錯誤訊息
      let errorMessage = '載入工作日誌失敗，請稍後再試';
      
      if (!navigator.onLine) {
        errorMessage = '網絡連接中斷，請檢查您的網絡連接';
      } else if (err.message && err.message.includes('timeout')) {
        errorMessage = '伺服器響應超時，請稍後再試';
      } else if (err.response) {
        // 處理特定的HTTP錯誤
        switch (err.response.status) {
          case 401:
            errorMessage = '登入狀態已失效，請重新登入';
            break;
          case 403:
            errorMessage = '您沒有權限查看工作日誌';
            break;
          case 404:
            errorMessage = '找不到工作日誌資源，請確認API設置';
            break;
          case 500:
            errorMessage = '伺服器內部錯誤，請聯繫系統管理員';
            break;
          default:
            errorMessage = `伺服器錯誤 (${err.response.status})，請稍後再試`;
        }
      } else if (err.request) {
        errorMessage = '無法連接到伺服器，請檢查網絡連接';
      }
      
      setError(errorMessage);
      setWorkLogs([]); // 重置工作日誌資料，避免顯示舊資料
      setGroupedWorkLogs({});
    } finally {
      setIsLoading(false);
    }
  }, [filter, calculateDateRange]);
    
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

  // 添加此函數用於測試API連接
  const testApiConnection = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/health-check`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      const data = await response.json();
      
      alert(`API連接測試結果: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      alert(`API連接測試失敗: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 處理日期變更
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    console.log('日期變更為:', newDate);
    
    if (newDate) {
      setFilter(prev => ({
        ...prev,
        date: newDate,
        startDate: newDate,  // 直接使用日期字符串，無需轉換
        endDate: newDate,    // 直接使用日期字符串，無需轉換
        dateRange: 'custom'  // 切換到自定義日期範圍
      }));
      
      // 立即載入新的日期的數據
      loadWorkLogs();
    }
  };
  
    
  // 組件掛載時加載數據
  useEffect(() => {
    loadWorkLogs();
  }, [loadWorkLogs]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 診斷輸出
  console.log('WorkLogReview 狀態:', {
    isLoading,
    error,
    workLogsCount: workLogs.length,
    groupedCount: Object.keys(groupedWorkLogs).length,
    filter
  });

  if (workLogs.length === 0 && !isLoading && !error) {
    console.warn('工作日誌列表為空，但沒有錯誤和載入狀態');
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
          <p className="mb-2">{error}</p>
          <div className="flex space-x-2">
            <Button onClick={handleRetry} className="mt-2">
              重試載入
            </Button>
            <Button 
              onClick={() => setShowDiagnostic(true)}
              variant="secondary"
              className="ml-2 mt-2"
            >
              診斷連接問題
            </Button>
            <Button 
              onClick={testApiConnection}
              variant="secondary"
              className="ml-2 mt-2"
            >
              測試API連接
            </Button>
          </div>
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
        
        {/* 添加按钮行 */}
        <div className="mt-4 flex justify-end">
          <Button 
  onClick={() => {
    console.log('執行搜尋，過濾條件:', filter);
    loadWorkLogs();
  }}
  className="bg-blue-600 hover:bg-blue-700"
>
  搜尋
          </Button>
          <Button 
            onClick={testApiConnection}
            variant="secondary"
            className="ml-2"
          >
            測試API連接
          </Button>
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
      {showDiagnostic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-3xl">
            <ApiDiagnostic onClose={() => setShowDiagnostic(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkLogReview;