// 新建文件：frontend/src/components/common/WorkLogDiagnostic.js

import React, { useState, useEffect } from 'react';
import { searchWorkLogs, getTodayHour } from '../../utils/api';
import { Button, Card } from '../ui';

const WorkLogDiagnostic = ({ onClose }) => {
  const [logs, setLogs] = useState([]);
  const [todayHours, setTodayHours] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const runDiagnostic = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const today = new Date().toISOString().split('T')[0];
        console.log('開始診斷，日期:', today);
        
        // 獲取今日工時
        const hoursData = await getTodayHour();
        setTodayHours(hoursData);
        
        // 獲取日誌列表
        const logsData = await searchWorkLogs({
          startDate: today,
          endDate: today
        });
        setLogs(logsData);
        
        console.log('診斷結果:', {
          工時數據: hoursData,
          日誌數量: logsData.length,
          日誌內容: logsData
        });
      } catch (err) {
        console.error('診斷失敗:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    runDiagnostic();
  }, []);

  return (
    <Card className="p-4">
      <h2 className="text-xl font-bold mb-4 flex justify-between">
        <span>工作日誌診斷</span>
        <Button onClick={onClose} variant="secondary" className="text-sm">關閉</Button>
      </h2>
      
      {isLoading ? (
        <div className="flex justify-center p-4">
          <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 p-4">{error}</div>
      ) : (
        <div>
          <div className="mb-4 p-3 bg-gray-800 rounded-lg">
            <h3 className="font-semibold mb-2">今日工時</h3>
            {todayHours ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-400">已完成時數</p>
                  <p className="text-xl text-blue-400">{todayHours.total_hours} 小時</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">剩餘時數</p>
                  <p className="text-xl text-yellow-400">{todayHours.remaining_hours} 小時</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">無法獲取工時資訊</p>
            )}
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">工作日誌記錄 ({logs.length})</h3>
            {logs.length === 0 ? (
              <p className="text-gray-400">沒有找到工作日誌記錄</p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={log.id || index} className="p-2 mb-2 bg-gray-800 rounded-lg">
                    <div className="text-sm">
                      <span className="text-blue-400">
                        {log.start_time} - {log.end_time}
                      </span>
                      <span className="mx-2">|</span>
                      <span>
                        {log.position_name || log.location} - {log.work_category_name || log.crop}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-4 text-xs text-gray-400">
            <p>
              連線狀態: {navigator.onLine ? '在線' : '離線'} | 
              認證令牌: {localStorage.getItem('token') ? '存在' : '不存在'} | 
              時間: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default WorkLogDiagnostic;