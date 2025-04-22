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
  // 請求防抖定時器
  const debounceTimerRef = useRef(null);

  // 手動刷新函數
  const handleRefresh = () => {
    // 強制觸發重新加載
    lastLoadTimeRef.current = 0;
    initialLoadDoneRef.current = false;
    loadStats();
  };

  // 加載統計數據的函數
  const loadStats = async () => {
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    // 如果不是強制刷新且距離上次加載不到30秒，使用緩存數據
    if (initialLoadDoneRef.current && timeSinceLastLoad < 30000 && cacheRef.current) {
      console.log(`使用緩存數據，距離上次加載 ${timeSinceLastLoad}ms`);
      return;
    }
    
    // 清除之前的定時器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 設置新的定時器，延遲 500ms 執行
    debounceTimerRef.current = setTimeout(async () => {
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
        console.error('載入工時統計失敗:', err);
        failedAttemptsRef.current += 1;
        
        // 如果連續失敗超過3次，顯示錯誤訊息
        if (failedAttemptsRef.current >= 3) {
          setError('無法載入工時統計，請稍後再試');
        }
        
        setIsLoading(false);
      }
    }, 500);
  };

  // 監聽 refreshTrigger 變化
  useEffect(() => {
    loadStats();
    
    // 清理函數
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [refreshTrigger]);

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