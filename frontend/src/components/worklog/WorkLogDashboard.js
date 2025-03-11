// 位置：frontend/src/components/worklog/WorkLogDashboard.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { searchWorkLogs, fetchLocationsByArea, fetchWorkCategories } from '../../utils/api';
import { Button, Card, Input } from '../ui';
import WorkLogForm from './WorkLogForm';
import WorkLogStats from './WorkLogStats';
import LocationSelector from '../common/LocationSelector';

const WorkLogDashboard = () => {
  const { user } = useAuth();
  const [workLogs, setWorkLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [areaData, setAreaData] = useState([]);
  const [workCategories, setWorkCategories] = useState([]);
  
  // 過濾條件
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0], // 今天
    endDate: new Date().toISOString().split('T')[0],   // 今天
    areaName: '',
    location_code: ''
  });

  // 載入工作日誌
  useEffect(() => {
    const loadWorkLogs = async () => {
      setIsLoading(true);
      try {
        const data = await searchWorkLogs(filters);
        setWorkLogs(data);
        setError(null);
      } catch (err) {
        console.error('載入工作日誌失敗:', err);
        setError('載入工作日誌失敗，請稍後再試');
        setWorkLogs([]); // 重置工作日誌資料，避免顯示舊資料
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkLogs();
  }, [filters]);

  // 載入位置和工作類別資料（用於過濾）
  useEffect(() => {
    const loadFilterData = async () => {
      setIsLoading(true);
      
      // 單獨處理每個API呼叫，確保一個失敗不會影響另一個
      try {
        try {
          const locationData = await fetchLocationsByArea();
          setAreaData(locationData);
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
          const categoryData = await fetchWorkCategories();
          setWorkCategories(categoryData);
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
        console.error('載入過濾資料失敗', err);
        // 即使整個 try-catch 區塊失敗，也確保有默認數據
        if (areaData.length === 0) {
          setAreaData([
            { areaName: 'A區', locations: [] },
            { areaName: 'B區', locations: [] },
            { areaName: 'C區', locations: [] }
          ]);
        }
        
        if (workCategories.length === 0) {
          setWorkCategories([
            { 工作內容代號: '1', 工作內容名稱: '整地' },
            { 工作內容代號: '2', 工作內容名稱: '種植' },
            { 工作內容代號: '3', 工作內容名稱: '施肥' },
            { 工作內容代號: '4', 工作內容名稱: '澆水' },
            { 工作內容代號: '5', 工作內容名稱: '收成' }
          ]);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFilterData();
  }, []);

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
  const refreshWorkLogs = async () => {
    setIsLoading(true);
    try {
      const data = await searchWorkLogs(filters);
      setWorkLogs(data);
      setError(null);
    } catch (err) {
      console.error('刷新工作日誌失敗:', err);
      setError('刷新工作日誌失敗，請稍後再試');
      // 保留原有數據，不進行清空
    } finally {
      setIsLoading(false);
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
            
            {/* 使用新的位置選擇器組件 */}
            <div className="md:col-span-1">
              <LocationSelector 
                onLocationSelect={handleLocationSelect} 
                areaData={areaData}
              />
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
              <Button onClick={refreshWorkLogs}>重試</Button>
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
                    // 計算工作時長（小時）
                    let durationHours = "N/A";
                    try {
                      if (log.start_time && log.end_time) {
                        const startParts = log.start_time.split(':');
                        const endParts = log.end_time.split(':');
                        
                        if (startParts.length === 2 && endParts.length === 2) {
                          const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
                          const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
                          
                          if (!isNaN(startMinutes) && !isNaN(endMinutes) && endMinutes >= startMinutes) {
                            durationHours = ((endMinutes - startMinutes) / 60).toFixed(2);
                          }
                        }
                      }
                    } catch (e) {
                      console.warn("時間計算錯誤:", e);
                    }
                    
                    return (
                      <tr key={log.id ? log.id.toString() : `index-${index}`} className={index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                        <td className="p-3">
                          {log.created_at ? new Date(log.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-3">
                          {log.start_time || 'N/A'} - {log.end_time || 'N/A'}
                        </td>
                        <td className="p-3">
                          {durationHours} 小時
                        </td>
                        <td className="p-3">
                          {log.area_name || 'N/A'}
                        </td>
                        <td className="p-3">
                          {log.position_name || 'N/A'}
                        </td>
                        <td className="p-3">
                          {log.work_category_name || 'N/A'}
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
    </div>
  );
};

export default WorkLogDashboard;