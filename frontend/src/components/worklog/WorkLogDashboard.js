// 位置：frontend/src/components/worklog/WorkLogDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchLocationsByArea, fetchWorkCategories, getApiStatus } from '../../utils/api';
import { Button, Card, Input } from '../ui';
import WorkLogForm from './WorkLogForm';
import WorkLogStats from './WorkLogStats';
import ApiDiagnostic from '../common/ApiDiagnostic';
import { useWorkLog } from '../../hooks/useWorkLog';
import { useWorkLogDetail } from '../../hooks/useWorkLogDetail';

const WorkLogDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { clearCache } = useWorkLog();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [areaData, setAreaData] = useState([]);
  const [workCategories, setWorkCategories] = useState([]);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [serverStatus, setServerStatus] = useState({ status: 'unknown', message: '檢查連線中...' });
  
  // 引入工作日誌詳情 hook
  const { showWorkLogDetail, renderWorkLogDetail } = useWorkLogDetail();
  
  // 過濾條件
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0], // 今天
    endDate: new Date().toISOString().split('T')[0],   // 今天
    areaName: '',
    location_code: '',
    work_category_code: ''
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
    
    // 清理函數
    return () => clearInterval(intervalId);
  }, [checkServerStatus, loadBaseData]);

  // 處理過濾器變更
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // 處理搜尋
  const handleSearch = () => {
    // 準備有效的過濾條件 (移除空值)
    const validFilters = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) validFilters[key] = value;
    });
    
    // 建立標題
    let title = '工作日誌搜尋結果';
    if (filters.startDate && filters.endDate) {
      if (filters.startDate === filters.endDate) {
        title = `${filters.startDate} 工作日誌`;
      } else {
        title = `${filters.startDate} ~ ${filters.endDate} 工作日誌`;
      }
    }
    
    // 加入篩選條件到標題
    if (filters.areaName) {
      title += ` - ${filters.areaName}`;
    }
    if (filters.work_category_code) {
      // 找出對應的類別名稱
      const category = workCategories.find(c => c.工作內容代號 === filters.work_category_code);
      if (category) {
        title += ` - ${category.工作內容名稱}`;
      }
    }
    
    // 顯示詳情彈窗
    showWorkLogDetail(validFilters, title);
  };

  // 查看今日工作日誌
  const handleViewTodayLogs = () => {
    const today = new Date().toISOString().split('T')[0];
    showWorkLogDetail({ 
      startDate: today, 
      endDate: today 
    }, `${today} 工作日誌`);
  };

  // 查看特定區域工作日誌
  const handleViewAreaLogs = (areaName) => {
    showWorkLogDetail({ 
      areaName,
      startDate: filters.startDate,
      endDate: filters.endDate
    }, `${areaName} 工作日誌`);
  };

  // 查看特定類別工作日誌
  const handleViewCategoryLogs = (categoryCode, categoryName) => {
    showWorkLogDetail({ 
      work_category_code: categoryCode,
      startDate: filters.startDate,
      endDate: filters.endDate
    }, `${categoryName} 工作日誌`);
  };

  // 重試按鈕的處理函數
  const handleRetry = () => {
    // 強制清除快取
    if (typeof clearCache === 'function') {
      clearCache();
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
          
          {/* 快速動作按鈕 */}
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={handleViewTodayLogs}
              className="bg-blue-600 hover:bg-blue-700"
            >
              查看今日所有工作日誌
            </Button>
          </div>
        </div>

        {/* 工作日誌表單 */}
        {showForm && (
          <div className="mb-6">
            <WorkLogForm 
              onSubmitSuccess={() => {
                setShowForm(false);
                handleViewTodayLogs(); // 提交成功後自動查看今日工作日誌
              }} 
            />
          </div>
        )}

        {/* 過濾器 */}
        <Card className="mb-6 p-4">
          <h2 className="text-lg font-semibold mb-4">搜尋工作日誌</h2>
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
              onClick={handleSearch}
              className="bg-green-600 hover:bg-green-700"
            >
              搜尋工作日誌
            </Button>
          </div>
        </Card>

        {/* 工作概覽卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 區域概覽 */}
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">區域工作概覽</h2>
            <div className="grid grid-cols-2 gap-2">
              {areaData.slice(0, 6).map(area => (
                <Button 
                  key={area.areaName}
                  onClick={() => handleViewAreaLogs(area.areaName)}
                  className="bg-gray-700 hover:bg-gray-600"
                >
                  {area.areaName}
                </Button>
              ))}
            </div>
            {areaData.length > 6 && (
              <div className="mt-2 text-center">
                <Button 
                  onClick={handleSearch}
                  variant="secondary"
                  className="text-sm"
                >
                  查看更多區域
                </Button>
              </div>
            )}
          </Card>
          
          {/* 工作類別概覽 */}
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">工作類別概覽</h2>
            <div className="grid grid-cols-2 gap-2">
              {workCategories.slice(0, 6).map(category => (
                <Button 
                  key={category.工作內容代號}
                  onClick={() => handleViewCategoryLogs(category.工作內容代號, category.工作內容名稱)}
                  className="bg-gray-700 hover:bg-gray-600"
                >
                  {category.工作內容名稱}
                </Button>
              ))}
            </div>
            {workCategories.length > 6 && (
              <div className="mt-2 text-center">
                <Button 
                  onClick={handleSearch}
                  variant="secondary"
                  className="text-sm"
                >
                  查看更多類別
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* 管理功能卡片 */}
        <Card className="mb-6 p-4">
          <h2 className="text-lg font-semibold mb-4">工作日誌管理工具</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => handleViewTodayLogs()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              今日工作日誌
            </Button>
            
            <Button 
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                showWorkLogDetail({ 
                  startDate: yesterdayStr, 
                  endDate: yesterdayStr 
                }, `${yesterdayStr} 工作日誌`);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              昨日工作日誌
            </Button>
            
            <Button 
              onClick={() => {
                const startDate = new Date();
                const endDate = new Date();
                startDate.setDate(endDate.getDate() - 6);
                
                showWorkLogDetail({ 
                  startDate: startDate.toISOString().split('T')[0], 
                  endDate: endDate.toISOString().split('T')[0] 
                }, `本週工作日誌`);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              本週工作日誌
            </Button>
          </div>
        </Card>
        
        {/* 說明卡片 */}
        <Card className="p-4 bg-gray-800">
          <h2 className="text-lg font-semibold mb-2">工作日誌使用說明</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>點擊「新增工作日誌」按鈕來記錄你的工作</li>
            <li>使用上方的過濾條件來搜尋特定工作日誌</li>
            <li>點擊區域或工作類別按鈕快速查看相關工作日誌</li>
            <li>每日工作時間需達8小時，請確保完成你的工作時數</li>
          </ul>
          
          {error && (
            <div className="mt-4 p-3 bg-red-800 rounded-lg">
              <p className="text-white">{error}</p>
              <div className="mt-2">
                <Button onClick={handleRetry}>重試載入</Button>
                <Button 
                  onClick={() => setShowDiagnostic(true)}
                  variant="secondary"
                  className="ml-2"
                >
                  診斷連接問題
                </Button>
              </div>
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
      
      {/* 渲染工作日誌詳情彈窗 */}
      {renderWorkLogDetail()}
    </div>
  );
};

export default WorkLogDashboard;