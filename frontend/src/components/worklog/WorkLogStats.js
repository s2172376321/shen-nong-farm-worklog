import React, { useState, useEffect, useRef } from 'react';
import { Card, Button } from '../ui';
import { getTodayHour } from '../../utils/api';

const WorkLogStats = ({ refreshTrigger = 0 }) => {
  const [stats, setStats] = useState({
    totalHours: 0,
    remainingHours: 8,
    isComplete: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 記錄上次加載時間
  const lastLoadTimeRef = useRef(0);
  // 記錄是否為初次加載
  const initialLoadDoneRef = useRef(false);
  // 記錄數據緩存
  const cacheRef = useRef(null);
  // 加載失敗計數
  const failedAttemptsRef = useRef(0);

  // 手動刷新函數
  const handleRefresh = () => {
    // 強制觸發重新加載
    lastLoadTimeRef.current = 0;
    initialLoadDoneRef.current = false;
  };

  useEffect(() => {
    const loadStats = async () => {
      // 防止頻繁加載
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;
      
      // 如果不是強制刷新(由 refreshTrigger 變化觸發)且距離上次加載不到5秒，跳過
      if (initialLoadDoneRef.current && timeSinceLastLoad < 5000 && refreshTrigger === 0) {
        console.log(`跳過工時統計加載，距離上次加載僅 ${timeSinceLastLoad}ms`);
        return;
      }
      
      setIsLoading(true);
      
      try {
        console.log('開始載入今日工時...');
        
        const data = await getTodayHour();
        
        // 確保返回數據格式正確
        if (typeof data !== 'object' || typeof data.total_hours === 'undefined') {
          throw new Error('工時數據格式不正確');
        }
        
        // 更新統計數據
        setStats({
          totalHours: parseFloat(data.total_hours),
          remainingHours: parseFloat(data.remaining_hours),
          isComplete: data.is_complete
        });
        
        // 更新快取
        cacheRef.current = {
          data,
          timestamp: now
        };
        
        // 更新最後加載時間和初始加載狀態
        lastLoadTimeRef.current = now;
        initialLoadDoneRef.current = true;
        failedAttemptsRef.current = 0;
        
        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error('載入工作統計資訊失敗:', err);
        
        // 增加失敗計數
        failedAttemptsRef.current += 1;
        
        // 如果有緩存數據且失敗次數不多，使用緩存數據
        if (cacheRef.current && failedAttemptsRef.current < 3) {
          console.log('使用緩存的工時數據');
          setStats({
            totalHours: parseFloat(cacheRef.current.data.total_hours),
            remainingHours: parseFloat(cacheRef.current.data.remaining_hours),
            isComplete: cacheRef.current.data.is_complete
          });
          setError(null);
        } else {
          // 多次失敗或沒有緩存時顯示錯誤
          setError(`載入工作統計資訊失敗: ${err.message || '請稍後再試'}`);
        }
        
        setIsLoading(false);
      }
    };
    
    // 立即載入資料
    loadStats();
    
    // 設置定時刷新，但間隔較長（5分鐘）
    const interval = setInterval(loadStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refreshTrigger]); // 依賴於 refreshTrigger，當其變化時重新載入數據

  // 加載中狀態
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="h-24 bg-gray-700 rounded"></div>
      </Card>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <Card className="bg-red-900 p-4">
        <div className="flex items-center justify-between">
          <p className="text-red-200">{error}</p>
          <Button 
            onClick={handleRefresh} 
            variant="secondary"
            className="px-2 py-1 text-sm"
          >
            重新載入
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">今日工作統計</h3>
        <Button 
          onClick={handleRefresh} 
          variant="secondary"
          className="px-2 py-1 text-sm"
        >
          重新整理
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-400">已完成工時</p>
          <p className="text-2xl font-bold text-blue-400">
            {stats.totalHours.toFixed(2)} 小時
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-400">剩餘工時</p>
          <p className="text-2xl font-bold text-yellow-400">
            {stats.remainingHours.toFixed(2)} 小時
          </p>
        </div>
      </div>
      
      {!stats.isComplete && (
        <div className="mt-2 px-3 py-2 bg-red-900 text-white rounded-lg text-sm">
          <p>提醒：每日工作時間需達8小時，請確保完成您的工作時數</p>
        </div>
      )}
      
      {stats.isComplete && (
        <div className="mt-2 px-3 py-2 bg-green-900 text-white rounded-lg text-sm">
          <p>今日工時已完成</p>
        </div>
      )}
    </Card>
  );
};

export default WorkLogStats;