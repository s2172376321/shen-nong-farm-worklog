// 位置：frontend/src/components/worklog/WorkLogStats.js

import React, { useState, useEffect } from 'react';
import { Card } from '../ui';
import { getTodayWorkHours } from '../../utils/api';

const WorkLogStats = () => {
  const [stats, setStats] = useState({
    totalHours: 0,
    remainingHours: 8,
    isComplete: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true);
        
        // 使用新的 API 函數獲取工時統計
        const data = await getTodayWorkHours();
        
        setStats({
          totalHours: parseFloat(data.total_hours),
          remainingHours: parseFloat(data.remaining_hours),
          isComplete: data.is_complete
        });
        
        setError(null);
      } catch (err) {
        console.error('載入工作統計資訊失敗:', err);
        setError(`載入工作統計資訊失敗: ${err.message || '請稍後再試'}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
    
    // 定期更新數據（每 5 分鐘）
    const interval = setInterval(loadStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="h-24 bg-gray-700 rounded"></div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900 p-4">
        <p className="text-red-200">{error}</p>
        <p className="text-sm text-red-300 mt-2">
          無法載入今日工時統計，將顯示默認值
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gray-800">
      <h3 className="text-lg font-semibold mb-2">今日工作統計</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-400">已完成工時</p>
          <p className="text-2xl font-bold text-blue-400">{stats.totalHours} 小時</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">剩餘工時</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.remainingHours} 小時</p>
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