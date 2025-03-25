// 位置：frontend/src/components/worklog/WorkLogDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  fetchLocationsByArea, 
  fetchWorkCategories, 
  getApiStatus,
  getWorkLogsByDate,
  getTodayWorkHours,
  checkServerHealth
} from '../../utils/api';
import { Button, Card, Input } from '../ui';
import WorkLogForm from './WorkLogForm';
import WorkLogStats from './WorkLogStats';
import ApiDiagnostic from '../common/ApiDiagnostic';

const WorkLogDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [workLogs, setWorkLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [areaData, setAreaData] = useState([]);
  const [workCategories, setWorkCategories] = useState([]);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [serverStatus, setServerStatus] = useState({ status: 'unknown', message: '檢查連線中...' });
  
  // 過濾條件
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0], // 今天
    endDate: new Date().toISOString().split('T')[0],   // 今天
    location: '',
    crop: ''
  });

  // 檢查伺服器狀態 - 使用 useCallback 避免重複創建函數
  const checkServerStatus = useCallback(async () => {
    try {
      const status = await getApiStatus();
      setServerStatus(status);
      console.log('伺服器狀態檢查結果:', status);
    } catch (err) {
      console.error('檢查伺服器狀態失敗:', err);
      setServerStatus({ status: 'offline', message: '無法連線到伺服器' });
    }
  }, []);

  // 簡化版本的工作日誌查詢函數
  const loadWorkLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 如果有選擇日期，使用該日期；否則使用今天日期
      const queryDate = filters.startDate || new Date().toISOString().split('T')[0];
      console.log('查詢日期:', queryDate);
      
      // 使用新的 API 函數
      const logs = await getWorkLogsByDate(queryDate);
      
      // 根據其他過濾條件進行本地過濾
      let filteredLogs = [...logs];
      
      // 位置過濾
      if (filters.location) {
        filteredLogs = filteredLogs.filter(log => 
          (log.location && log.location.toLowerCase().includes(filters.location.toLowerCase())) ||
          (log.position_name && log.position_name.toLowerCase().includes(filters.location.toLowerCase()))
        );
      }
      
      // 作物/工作類別過濾
      if (filters.crop) {
        filteredLogs = filteredLogs.filter(log => 
          (log.crop && log.crop.toLowerCase().includes(filters.crop.toLowerCase())) ||
          (log.work_category_name && log.work_category_name.toLowerCase().includes(filters.crop.toLowerCase()))
        );
      }
      
      console.log(`查詢到 ${logs.length} 條記錄，過濾後剩餘 ${filteredLogs.length} 條`);
      setWorkLogs(filteredLogs);
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
            setTimeout(() => {
              logout();
              navigate('/login');
            }, 2000);
            break;
          case 403:
            errorMessage = '您沒有權限查看工作日誌';
            break;
          case 500:
            errorMessage = '伺服器內部錯誤，請聯繫系統管理員';
            break;
          default:
            errorMessage = `伺服器錯誤 (${err.response.status})，請稍後再試`;
        }
      }
      
      setError(errorMessage);
      setWorkLogs([]); // 重置工作日誌資料
    } finally {
      setIsLoading(false);
    }
  }, [filters, logout, navigate]);

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

  // 組件掛載後載入數據
  useEffect(() => {
    // 檢查伺服器狀態
    checkServerStatus();
    // 每30秒檢查一次
    const intervalId = setInterval(checkServerStatus, 30000);
    
    // 載入基礎數據
    loadBaseData();
    
    // 載入工作日誌
    loadWorkLogs();
    
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
      location: locationData.locationName || ''
    }));
  };

  // 刷新工作日誌列表
  const refreshWorkLogs = () => {
    loadWorkLogs();
  };

  // 重試按鈕的處理函數
  const handleRetry = () => {
    // 重新載入資料
    loadWorkLogs();
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
              onSubmitSuccess={() => {
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
              <label className="block mb-2 text-sm">位置搜索</label>
              <Input 
                type="text"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
                placeholder="輸入位置關鍵字..."
              />
            </div>
            
            <div>
              <label className="block mb-2 text-sm">作物/工作類別搜索</label>
              <Input 
                type="text"
                name="crop"
                value={filters.crop}
                onChange={handleFilterChange}
                placeholder="輸入作物或工作類別關鍵字..."
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={refreshWorkLogs}
              className="bg-green-600 hover:bg-green-700"
            >
              查詢
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
            <ApiDiagnostic onClose={() => setShowDiagnostic(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkLogDashboard;