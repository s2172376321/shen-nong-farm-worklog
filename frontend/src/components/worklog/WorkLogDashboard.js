// 位置：frontend/src/components/worklog/WorkLogDashboard.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchLocationsByArea, fetchWorkCategories, getApiStatus } from '../../utils/api';
import { Button, Card, Input } from '../ui';
import WorkLogForm from './WorkLogForm';
import WorkLogStats from './WorkLogStats';
import ApiDiagnostic from '../common/ApiDiagnostic';
import { useWorkLog } from '../../hooks/useWorkLog';
import { toast } from 'react-toastify'; // 如果项目使用了 react-toastify

const WorkLogDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { fetchWorkLogs, clearCache } = useWorkLog();
  const [workLogs, setWorkLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [areaData, setAreaData] = useState([]);
  const [workCategories, setWorkCategories] = useState([]);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [serverStatus, setServerStatus] = useState({ status: 'unknown', message: '檢查連線中...' });
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const refreshTimerRef = useRef(null);
  
  // 過濾條件
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0], // 今天
    endDate: new Date().toISOString().split('T')[0],   // 今天
    areaName: '',
    location_code: ''
  });

  // 檢查伺服器狀態 - 使用 useCallback 避免重複創建函數
  const checkServerStatus = useCallback(async () => {
    try {
      const status = await getApiStatus();
      setServerStatus(status);
      console.log('伺服器狀態檢查結果:', status);
      return status;
    } catch (err) {
      console.error('檢查伺服器狀態失敗:', err);
      setServerStatus({ status: 'offline', message: '無法連線到伺服器' });
      return { status: 'offline', message: '無法連線到伺服器' };
    }
  }, []);

  // 載入工作日誌 - 加強版，使用強制更新參數
  const loadWorkLogs = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 增加載入狀態日誌
      console.log('開始載入工作日誌，過濾條件:', filters, '強制更新:', forceRefresh);
      
      // 如果要強制更新，先清除緩存
      if (forceRefresh && typeof clearCache === 'function') {
        clearCache();
      }
      
      // 增加診斷資訊
      const networkStatus = navigator.onLine ? '在線' : '離線';
      const token = localStorage.getItem('token') ? '存在' : '不存在';
      console.log('診斷資訊:', { networkStatus, token, timestamp: new Date().toISOString() });
      
      const data = await fetchWorkLogs(filters);
      
      if (Array.isArray(data)) {
        console.log(`成功載入 ${data.length} 條工作日誌`);
        setWorkLogs(data);
        setLastRefreshTime(new Date());
      } else {
        console.error('工作日誌數據格式不正確:', data);
        setWorkLogs([]);
        setError('返回數據格式不正確，請聯繫系統管理員');
      }
    } catch (err) {
      console.error('載入工作日誌失敗:', err);
      
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
            // 可選：自動登出並重定向
            setTimeout(() => {
              logout();
              navigate('/login');
            }, 2000);
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
    } finally {
      setIsLoading(false);
    }
  }, [filters, fetchWorkLogs, logout, navigate, clearCache]);

  // 載入基礎數據（位置和工作類別）
  const loadBaseData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // 單獨處理每個API呼叫，確保一個失敗不會影響另一個
      try {
        console.log('載入位置數據中...');
        const locationData = await fetchLocationsByArea();
        setAreaData(locationData);
        console.log(`成功載入 ${locationData.length} 個區域位置數據`);
      } catch (locError) {
        console.error('載入位置資料失敗:', locError);
        // 設置默認數據
        setAreaData([
          { areaName: 'A區', locations: [] },
          { areaName: 'B區', locations: [] },
          { areaName: 'C區', locations: [] }
        ]);
      }
      
      try {
        console.log('載入工作類別數據中...');
        const categoryData = await fetchWorkCategories();
        setWorkCategories(categoryData);
        console.log(`成功載入 ${categoryData.length} 個工作類別`);
      } catch (catError) {
        console.error('載入工作類別資料失敗:', catError);
        // 設置默認數據
        setWorkCategories([
          { 工作內容代號: '1', 工作內容名稱: '整地' },
          { 工作內容代號: '2', 工作內容名稱: '種植' },
          { 工作內容代號: '3', 工作內容名稱: '施肥' },
          { 工作內容代號: '4', 工作內容名稱: '澆水' },
          { 工作內容代號: '5', 工作內容名稱: '收成' }
        ]);
      }
    } catch (err) {
      console.error('載入基礎數據失敗:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 設置定期自動刷新 - 添加一個新的 useEffect
  useEffect(() => {
    // 每45秒自動刷新一次
    refreshTimerRef.current = setInterval(() => {
      // 自動刷新時不顯示加載指示器，靜默更新
      loadWorkLogs(true);
      console.log('自動刷新工作日誌', new Date().toLocaleTimeString());
    }, 45000);
    
    // 清理函數
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [loadWorkLogs]);

  // 組件掛載後載入數據
  useEffect(() => {
    // 檢查伺服器狀態
    checkServerStatus();
    // 每30秒檢查一次
    const intervalId = setInterval(checkServerStatus, 30000);
    
    // 載入基礎數據
    loadBaseData();
    
    // 載入工作日誌
    loadWorkLogs(true); // 初始加載時強制刷新
    
    // 清理函數
    return () => clearInterval(intervalId);
  }, [checkServerStatus, loadBaseData, loadWorkLogs]);

  // 處理過濾器變更
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // 處理位置選擇
  const handleLocationSelect = (locationData) => {
    if (!locationData) return;
    
    setFilters(prev => ({
      ...prev, 
      areaName: locationData.areaName || '',
      location_code: locationData.locationCode || ''
    }));
  };

  // 刷新工作日誌列表 - 改進版，包含通知和緩存清除
  const refreshWorkLogs = async () => {
    // 強制清除緩存
    if (typeof clearCache === 'function') {
      clearCache(); // 清除所有工作日誌相關緩存
    }
    
    // 顯示刷新提示
    if (typeof toast !== 'undefined') {
      toast.info('正在刷新工作日誌列表...');
    }
    
    await loadWorkLogs(true); // 強制刷新
    
    // 顯示成功提示
    if (typeof toast !== 'undefined') {
      toast.success('工作日誌列表已更新');
    }
  };

  // 處理工作日誌提交成功
  const handleSubmitSuccess = () => {
    // 隱藏表單
    setShowForm(false);
    
    // 強制刷新列表
    refreshWorkLogs();
    
    // 顯示成功消息
    if (typeof toast !== 'undefined') {
      toast.success('工作日誌已成功提交');
    }
  };

  // 重試按鈕的處理函數
  const handleRetry = () => {
    // 強制清除快取
    if (typeof clearCache === 'function') {
      clearCache();
    }
    
    // 重新載入資料
    refreshWorkLogs();
  };

  // 格式化時間顯示
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    if (timeString.length <= 5) return timeString;
    return timeString.substring(0, 5);
  };

  // 計算工作時長
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "N/A";
    
    try {
      const startParts = startTime.split(':');
      const endParts = endTime.split(':');
      
      if (startParts.length !== 2 || endParts.length !== 2) return "N/A";
      
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      
      if (isNaN(startMinutes) || isNaN(endMinutes) || endMinutes <= startMinutes) return "N/A";
      
      const durationHours = ((endMinutes - startMinutes) / 60).toFixed(2);
      return `${durationHours} 小時`;
    } catch (e) {
      console.error("時間計算錯誤:", e);
      return "N/A";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">工作日誌管理</h1>
          <div>
            <Button 
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {showForm ? '關閉表單' : '新增工作日誌'}
            </Button>
          </div>
        </div>

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

        {/* 工作時間統計 */}
        <div className="mb-6">
          <WorkLogStats />
        </div>

        {/* 工作日誌表單 */}
        {showForm && (
          <div className="mb-6">
            <WorkLogForm 
              onSubmitSuccess={handleSubmitSuccess}
            />
          </div>
        )}

        {/* 過濾器 */}
        <Card className="mb-6 p-4">
          <h2 className="text-lg font-semibold mb-4">過濾條件</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm">開始日期</label>
              <Input 
                type="date" 
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label className="block mb-2 text-sm">結束日期</label>
              <Input 
                type="date" 
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </div>
            
            <div>
              <label className="block mb-2 text-sm">區域</label>
              <select
                name="areaName"
                value={filters.areaName}
                onChange={handleFilterChange}
                className="w-full bg-gray-700 text-white p-2 rounded-lg"
              >
                <option value="">所有區域</option>
                {areaData && areaData.map(area => (
                  <option key={area.areaName} value={area.areaName}>
                    {area.areaName}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block mb-2 text-sm">工作類別</label>
              <select
                name="work_category_code"
                value={filters.work_category_code || ''}
                onChange={handleFilterChange}
                className="w-full bg-gray-700 text-white p-2 rounded-lg"
              >
                <option value="">所有類別</option>
                {workCategories.map(category => (
                  <option key={category.工作內容代號} value={category.工作內容代號}>
                    {category.工作內容名稱}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {lastRefreshTime && `上次更新: ${lastRefreshTime.toLocaleTimeString()}`}
            </div>
            <Button 
              onClick={refreshWorkLogs}
              className="bg-green-600 hover:bg-green-700"
            >
              重新整理
            </Button>
          </div>
        </Card>

        {/* 工作日誌列表 */}
        <Card>
          <h2 className="text-lg font-semibold p-4 border-b border-gray-700">工作日誌列表</h2>
          
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <div className="bg-gray-800 p-4 rounded-lg text-sm text-left mb-4">
                <p className="font-semibold mb-2">診斷信息:</p>
                <ul className="list-disc list-inside">
                  <li>網絡狀態: {navigator.onLine ? '在線' : '離線'}</li>
                  <li>認證狀態: {localStorage.getItem('token') ? '已登入' : '未登入'}</li>
                  <li>API地址: {process.env.REACT_APP_API_URL || '未設置'}</li>
                  <li>瀏覽器: {navigator.userAgent}</li>
                </ul>
              </div>
              <div className="flex space-x-4 justify-center">
                <Button onClick={handleRetry}>重試載入</Button>
                <Button 
                  onClick={() => setShowDiagnostic(true)}
                  variant="secondary"
                >
                  診斷連接問題
                </Button>
              </div>
            </div>
          ) : workLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>沒有找到符合條件的工作日誌</p>
              <p className="mt-2 text-sm">您可以點擊「新增工作日誌」按鈕來建立</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="p-3 text-left">日期</th>
                    <th className="p-3 text-left">時間</th>
                    <th className="p-3 text-left">工作時長</th>
                    <th className="p-3 text-left">區域</th>
                    <th className="p-3 text-left">位置</th>
                    <th className="p-3 text-left">工作類別</th>
                    <th className="p-3 text-left">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {workLogs.map((log, index) => {
                    const durationHours = log.work_hours || calculateDuration(log.start_time, log.end_time);
                    
                    return (
                      <tr key={log.id || `index-${index}`} className={index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                        <td className="p-3">
                          {log.created_at ? new Date(log.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-3">
                          {formatTime(log.start_time)} - {formatTime(log.end_time)}
                        </td>
                        <td className="p-3">
                          {typeof durationHours === 'number' ? `${durationHours.toFixed(2)} 小時` : durationHours}
                        </td>
                        <td className="p-3">
                          {log.area_name || filters.areaName || 'N/A'}
                        </td>
                        <td className="p-3">
                          {log.position_name || log.location || 'N/A'}
                        </td>
                        <td className="p-3">
                          {log.work_category_name || log.crop || 'N/A'}
                        </td>
                        <td className="p-3">
                          <span 
                            className={`px-2 py-1 rounded text-xs 
                              ${log.status === 'approved' ? 'bg-green-800 text-green-200' : 
                                log.status === 'rejected' ? 'bg-red-800 text-red-200' : 
                                'bg-yellow-800 text-yellow-200'}`}
                          >
                            {log.status === 'approved' ? '已核准' : 
                              log.status === 'rejected' ? '已拒絕' : '審核中'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* 診斷工具彈窗 */}
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

export default WorkLogDashboard;