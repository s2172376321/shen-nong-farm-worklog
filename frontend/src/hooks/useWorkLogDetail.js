// 位置：frontend/src/hooks/useWorkLogDetail.js
import React, { useState, useCallback } from 'react';
import { searchWorkLogs } from '../utils/api';
import { Card, Button } from '../components/ui';

/**
 * 工作日誌詳情鉤子
 * 提供查看工作日誌詳情的邏輯和 UI 渲染功能
 */
export const useWorkLogDetail = () => {
  const [detailFilters, setDetailFilters] = useState(null);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailData, setDetailData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  
  // 關閉詳情彈窗
  const closeWorkLogDetail = useCallback(() => {
    setDetailFilters(null);
  }, []);
  
  // 打開工作日誌詳情彈窗
  const showWorkLogDetail = useCallback(async (filters, title = '工作日誌詳情') => {
    if (!filters) return;
    
    setDetailFilters(filters);
    setDetailTitle(title);
    setIsLoading(true);
    setDetailError(null);
    
    try {
      console.log('獲取工作日誌詳情:', filters);
      const data = await searchWorkLogs(filters);
      setDetailData(data);
      
      // 如果沒有工作日誌，設置提示訊息
      if (!data || data.length === 0) {
        setDetailError('無符合條件的工作日誌');
      }
    } catch (err) {
      console.error('獲取工作日誌詳情失敗:', err);
      setDetailError(err.message || '獲取工作日誌詳情失敗');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
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
  
  // 渲染工作日誌詳情
  const renderWorkLogDetail = useCallback(() => {
    if (!detailFilters) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="w-full max-w-5xl max-h-full">
          <Card className="p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{detailTitle}</h2>
              <Button 
                onClick={closeWorkLogDetail}
                variant="secondary"
                className="px-2 py-1"
              >
                關閉
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : detailError ? (
              <div className="p-8 text-center">
                <p className="text-red-400 mb-4">{detailError}</p>
              </div>
            ) : detailData.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400">沒有找到符合條件的工作日誌</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-800">
                      <th className="p-3 text-left">日期</th>
                      <th className="p-3 text-left">時間</th>
                      <th className="p-3 text-left">工作時長</th>
                      <th className="p-3 text-left">位置</th>
                      <th className="p-3 text-left">工作類別</th>
                      <th className="p-3 text-left">作物</th>
                      <th className="p-3 text-left">詳情</th>
                      <th className="p-3 text-left">狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailData.map((log, index) => {
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
                            {log.position_name || log.location || 'N/A'}
                          </td>
                          <td className="p-3">
                            {log.work_category_name || log.crop || 'N/A'}
                          </td>
                          <td className="p-3">
                            {log.crop || 'N/A'}
                          </td>
                          <td className="p-3 max-w-[200px] truncate" title={log.details}>
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
  }, [detailFilters, detailTitle, detailData, isLoading, detailError, closeWorkLogDetail]);
  
  return {
    showWorkLogDetail,
    closeWorkLogDetail,
    renderWorkLogDetail,
    isLoading,
    detailError
  };
};