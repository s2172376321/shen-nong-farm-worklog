// 位置：frontend/src/components/worklog/WorkLogDashboard.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchLocationsByArea, fetchWorkCategories } from '../../utils/api';
import { Button, Card, Input } from '../ui';
import WorkLogForm from './WorkLogForm';
import WorkLogStats from './WorkLogStats';
import { useWorkLog } from '../../hooks/useWorkLog';
import { useApiStatus } from '../../context/ApiStatusProvider';

const WorkLogDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { fetchWorkLogs, refreshWorkLogs, isLoading, error, isInitialLoadDone, manualRefreshCount } = useWorkLog();
  const { isOnline, showStatus, setShowStatus } = useApiStatus();
  const [workLogs, setWorkLogs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [areaData, setAreaData] = useState([]);
  const [workCategories, setWorkCategories] = useState([]);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [serverStatus, setServerStatus] = useState({ status: 'unknown', message: '檢查連線中...' });
  
  // 用於控制加載動畫的狀態
  const [localLoading, setLocalLoading] = useState(true);
  // 記錄初始加載狀態
  const initialLoadRef = useRef(false);
  // 記錄最後一次數據加載時間
  const lastLoadTimeRef = useRef(0);
  
  // 過濾條件
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0], // 今天
    endDate: new Date().toISOString().split('T')[0],   // 今天
    areaName: '',
    location_code: ''
  });

  // 載入工作日誌，使用優化後的 fetchWorkLogs
  const loadWorkLogs = useCallback(async (forceRefresh = false) => {
    // 防止頻繁重複加載
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    // 如果不是強制刷新且距離上次加載不到3秒，則跳過
    if (!forceRefresh && timeSinceLastLoad < 3000 && initialLoadRef.current) {
      console.log(`跳過加載，距離上次加載僅 ${timeSinceLastLoad}ms`);
      return;
    }
    
    setLocalLoading(true);
    
    try {
      console.log('開始載入工作日誌, forceRefresh:', forceRefresh);
      
      // 使用優化後的 fetchWorkLogs，可選強制刷新
      const options = { forceRefresh };
      const data = await fetchWorkLogs(filters, options);
      
      if (Array.isArray(data)) {
        setWorkLogs(data);
        console.log(`工作日誌加載成功，項目數:`, data.length);
      } else {
        console.warn('工作日誌數據格式不正確:', data);
        setWorkLogs([]);
      }
      
      // 更新最後加載時間和初始加載標記
      lastLoadTimeRef.current = now;
      initialLoadRef.current = true;
    } catch (err) {
      console.error('工作日誌加載失敗:', err);
      // 僅在強制刷新時顯示錯誤
      if (forceRefresh) {
        // 由於 useWorkLog hook 已經處理了錯誤，這裡不需要額外處理
      }
    } finally {
      setLocalLoading(false);
    }
  }, [fetchWorkLogs, filters]);

  // 載入基礎數據（位置和工作類別）
  const loadBaseData = useCallback(async () => {
    setLocalLoading(true);
    
    try {
      // 使用 Promise.allSettled 確保即使其中一個請求失敗也不會影響另一個
      const results = await Promise.allSettled([
        fetchLocationsByArea(),
        fetchWorkCategories()
      ]);
      
      // 處理位置數據
      if (results[0].status === 'fulfilled') {
        setAreaData(results[0].value);
      } else {
        console.error('載入位置資料失敗:', results[0].reason);
        setAreaData([
          { areaName: 'A區', locations: [] },
          { areaName: 'B區', locations: [] }
        ]);
      }
      
      // 處理工作類別數據
      if (results[1].status === 'fulfilled') {
        setWorkCategories(results[1].value);
      } else {
        console.error('載入工作類別資料失敗:', results[1].reason);
        setWorkCategories([]);
      }
    } catch (err) {
      console.error('載入基礎數據失敗:', err);
    } finally {
      setLocalLoading(false);
    }
  }, []);

  // 組件掛載後載入數據 - 只執行一次
  useEffect(() => {
    // 載入基礎數據
    loadBaseData();
    
    // 進行初始工作日誌載入
    loadWorkLogs(false);
  }, [loadBaseData, loadWorkLogs]);

  // 當過濾條件變更時重新載入
  useEffect(() => {
    if (initialLoadRef.current) {
      loadWorkLogs(false);
    }
  }, [filters, loadWorkLogs]);

  // 監聽強制刷新狀態
  useEffect(() => {
    if (manualRefreshCount > 0) {
      loadWorkLogs(true);
    }
  }, [manualRefreshCount, loadWorkLogs]);

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

  // 刷新工作日誌列表
  const handleManualRefresh = () => {
    refreshWorkLogs(filters);
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

  // 判斷是否顯示加載狀態
  const shouldShowLoading = isLoading || localLoading;

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

        {/* 工作時間統計 - 傳入 refreshTrigger 避免重複查詢 */}
        <div className="mb-6">
          <WorkLogStats refreshTrigger={manualRefreshCount} />
        </div>

        {/* 工作日誌表單 */}
        {showForm && (
          <div className="mb-6">
            <WorkLogForm 
              onSubmitSuccess={() => {
                // 表單提交成功後刷新數據
                refreshWorkLogs();
                setShowForm(false);
              }} 
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
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={handleManualRefresh}
              className="bg-green-600 hover:bg-green-700"
              disabled={shouldShowLoading}
            >
              {shouldShowLoading ? '載入中...' : '手動刷新'}
            </Button>
          </div>
        </Card>

        {/* 工作日誌列表 */}
        <Card>
          <h2 className="text-lg font-semibold p-4 border-b border-gray-700">工作日誌列表</h2>
          
          {shouldShowLoading ? (
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
                <Button onClick={handleManualRefresh}>重試載入</Button>
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
                          {log.area_name || 'N/A'}
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
            {/* 診斷工具內容 */}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkLogDashboard;