// 位置：frontend/src/components/worklog/UserDailyWorkLogs.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserDailyWorkLogs } from '../../utils/api';
import { Card, Button } from '../ui';

const UserDailyWorkLogs = ({ userId, workDate, onClose }) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 處理日期格式轉換為更友好的顯示
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return new Date(dateString).toLocaleDateString('zh-TW', options);
  };
  
  // 計算工作時長
  const calculateDuration = (startTime, endTime) => {
    try {
      const startParts = startTime.split(':').map(Number);
      const endParts = endTime.split(':').map(Number);
      
      if (startParts.length !== 2 || endParts.length !== 2) {
        return 'N/A';
      }
      
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      
      if (isNaN(startMinutes) || isNaN(endMinutes) || endMinutes <= startMinutes) {
        return 'N/A';
      }
      
      // 計算時長時需排除午休時間
      let durationMinutes = endMinutes - startMinutes;
      
      // 排除午休時間 (12:00-13:00)
      if (startMinutes < 12 * 60 && endMinutes > 13 * 60) {
        durationMinutes -= 60;
      } else if (startMinutes < 13 * 60 && endMinutes > 12 * 60 && endMinutes <= 13 * 60) {
        durationMinutes -= (endMinutes - 12 * 60);
      } else if (startMinutes >= 12 * 60 && startMinutes < 13 * 60 && endMinutes > 13 * 60) {
        durationMinutes -= (13 * 60 - startMinutes);
      }
      
      const durationHours = (durationMinutes / 60).toFixed(2);
      return `${durationHours} 小時`;
    } catch (e) {
      console.error("時間計算錯誤:", e);
      return "N/A";
    }
  };

  // 載入工作日誌數據
  useEffect(() => {
    const loadWorkLogs = async () => {
      if (!userId || !workDate) {
        setError('缺少必要參數');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await getUserDailyWorkLogs(userId, workDate);
        setData(response);
      } catch (err) {
        console.error('載入工作日誌失敗:', err);
        setError(err.message || '載入工作日誌失敗');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWorkLogs();
  }, [userId, workDate]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 bg-red-900">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">載入工作日誌失敗</h2>
          <Button onClick={onClose} variant="secondary" className="px-2 py-1">關閉</Button>
        </div>
        <p className="text-red-200">{error}</p>
      </Card>
    );
  }

  if (!data || !data.workLogs || data.workLogs.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">工作日誌詳情 - {formatDate(workDate)}</h2>
          <Button onClick={onClose} variant="secondary" className="px-2 py-1">關閉</Button>
        </div>
        <p className="text-gray-400">沒有找到該日期的工作日誌</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">工作日誌詳情 - {formatDate(workDate)}</h2>
        <Button onClick={onClose} variant="secondary" className="px-2 py-1">關閉</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-800 p-3 rounded-lg">
          <h3 className="text-sm text-gray-400">使用者</h3>
          <p className="text-lg">{data.username || userId}</p>
        </div>
        <div className="bg-gray-800 p-3 rounded-lg">
          <h3 className="text-sm text-gray-400">總工時</h3>
          <p className="text-lg font-bold text-blue-400">{data.totalHours} 小時</p>
        </div>
        <div className="bg-gray-800 p-3 rounded-lg">
          <h3 className="text-sm text-gray-400">工時狀態</h3>
          <p className={`text-lg font-bold ${data.isComplete ? 'text-green-400' : 'text-yellow-400'}`}>
            {data.isComplete ? '已完成' : `尚缺 ${data.remainingHours} 小時`}
          </p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-800">
              <th className="p-3 text-left">時間</th>
              <th className="p-3 text-left">時長</th>
              <th className="p-3 text-left">位置</th>
              <th className="p-3 text-left">工作類別</th>
              <th className="p-3 text-left">作物</th>
              <th className="p-3 text-left">詳情</th>
              <th className="p-3 text-left">狀態</th>
            </tr>
          </thead>
          <tbody>
            {data.workLogs.map((log, index) => (
              <tr key={log.id || index} className={index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                <td className="p-3">
                  {log.start_time} - {log.end_time}
                </td>
                <td className="p-3">
                  {log.work_hours ? `${log.work_hours}小時` : calculateDuration(log.start_time, log.end_time)}
                </td>
                <td className="p-3">
                  {log.position_name || log.location || 'N/A'}
                </td>
                <td className="p-3">
                  {log.work_category_name || 'N/A'}
                </td>
                <td className="p-3">
                  {log.crop || 'N/A'}
                </td>
                <td className="p-3">
                  {log.details || '(無)'}
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
            ))}
          </tbody>
        </table>
      </div>
      
      {/* 如果是管理員，顯示特別提示 */}
      {user.role === 'admin' && (
        <div className="mt-4 p-2 bg-blue-900 rounded-lg text-sm">
          <p className="text-blue-200">
            <span className="font-bold">管理員備註:</span> 您正在檢視使用者的工作日誌。您可以從工作日誌審核頁面進行審核操作。
          </p>
        </div>
      )}
    </Card>
  );
};

export default UserDailyWorkLogs;