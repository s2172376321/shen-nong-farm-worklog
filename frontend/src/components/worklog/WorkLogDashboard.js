// 位置：frontend/src/components/worklog/WorkLogDashboard.js
import React, { useState, useEffect } from 'react';
import { getTodayHour, checkServerHealth } from '../../utils/api';
import { Button, Card } from '../ui';
import WorkLogForm from './WorkLogForm';
import WorkLogList from './WorkLogList';
import { getApiStatus } from '../../utils/api';


const WorkLogDashboard = () => {
  const [showForm, setShowForm] = useState(false);
  const [todayStats, setTodayStats] = useState({
    total_hours: 0,
    remaining_hours: 8,
    is_complete: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState({ status: 'unknown', message: '檢查連線中...' });
  
  
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


  // 檢查伺服器連線
  useEffect(() => {
    // 檢查令牌
    console.log('Dashboard掛載時 - Token存在:', localStorage.getItem('token') ? '是' : '否');
    
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
  
  
  // 載入今日工時
  useEffect(() => {
    const loadTodayHour = async () => {
      setIsLoading(true);
      try {
        const data = await getTodayHour();
        setTodayStats({
          total_hours: parseFloat(data.total_hours || 0).toFixed(2),
          remaining_hours: parseFloat(data.remaining_hours || 8).toFixed(2),
          is_complete: !!data.is_complete
        });
        setError(null);
      } catch (err) {
        console.error('載入今日工時失敗:', err);
        setError('載入今日工時失敗，請稍後再試');
      } finally {
        setIsLoading(false);
      }
    };

    loadTodayHour();
    const interval = setInterval(loadTodayHour, 5 * 60 * 1000); // 每5分鐘更新一次
    
    return () => clearInterval(interval);
  }, []);

  // 工作日誌提交成功後的處理
  const handleSubmitSuccess = () => {
    // 關閉表單
    setShowForm(false);
    
    // 重新載入今日工時
    getTodayHour()
      .then(data => {
        setTodayStats({
          total_hours: parseFloat(data.total_hours || 0).toFixed(2),
          remaining_hours: parseFloat(data.remaining_hours || 8).toFixed(2),
          is_complete: !!data.is_complete
        });
      })
      .catch(console.error);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">工作日誌管理</h1>
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {showForm ? '關閉表單' : '新增工作日誌'}
          </Button>
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

        {/* 顯示今日工時統計 */}
        <Card className="mb-6 p-4 bg-gray-800">
          <h2 className="text-lg font-semibold mb-4">今日工作統計</h2>
          
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-700 rounded w-1/4"></div>
              <div className="h-6 bg-gray-700 rounded w-1/2"></div>
            </div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-400">已完成工時</p>
                <p className="text-2xl font-bold text-blue-400">{todayStats.total_hours} 小時</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">剩餘工時</p>
                <p className="text-2xl font-bold text-yellow-400">{todayStats.remaining_hours} 小時</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">狀態</p>
                <p className={`text-lg font-medium ${todayStats.is_complete ? 'text-green-400' : 'text-red-400'}`}>
                  {todayStats.is_complete ? '已完成' : '未完成'}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* 工作日誌表單 */}
        {showForm && (
          <div className="mb-6">
            <WorkLogForm onSubmitSuccess={handleSubmitSuccess} />
          </div>
        )}

        {/* 工作日誌列表 */}
        <WorkLogList />
      </div>
    </div>
  );
};

export default WorkLogDashboard;