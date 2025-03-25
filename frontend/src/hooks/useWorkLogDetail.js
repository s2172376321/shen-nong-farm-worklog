// 位置：frontend/src/hooks/useWorkLogDetail.js
import React, { useState } from 'react';
import { searchWorkLogs } from '../utils/api';
import { Button, Card } from '../components/ui';

export const useWorkLogDetail = () => {
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [detailData, setDetailData] = useState([]);
  const [detailTitle, setDetailTitle] = useState('');
  const [filterParams, setFilterParams] = useState({});

  // 顯示工作日誌詳情 - 增強版，接受任意過濾條件
  const showWorkLogDetail = async (filters = {}, title = '工作日誌詳情') => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailTitle(title);
    setFilterParams(filters);
    
    try {
      const logs = await searchWorkLogs(filters);
      
      if (Array.isArray(logs)) {
        // 按日期、開始時間排序
        const sortedLogs = [...logs].sort((a, b) => {
          // 先依日期排序
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          if (dateA.getTime() !== dateB.getTime()) {
            return dateB.getTime() - dateA.getTime(); // 反向排序日期，新的在前
          }
          // 若日期相同，按開始時間排序
          return a.start_time.localeCompare(b.start_time);
        });
        
        setDetailData(sortedLogs);
      } else {
        setDetailData([]);
        setDetailError('獲取工作日誌格式不正確');
      }
    } catch (err) {
      console.error('獲取工作日誌詳情失敗:', err);
      setDetailError('獲取工作日誌詳情失敗: ' + (err.message || '未知錯誤'));
      setDetailData([]);
    } finally {
      setDetailLoading(false);
    }
  };

  // 格式化時間顯示
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    if (timeString.length <= 5) return timeString;
    return timeString.substring(0, 5);
  };

  // 格式化日期顯示
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString();
  };

  // 計算總工時
  const calculateTotalHours = (logs) => {
    if (!Array.isArray(logs) || logs.length === 0) return 0;
    
    const total = logs.reduce((sum, log) => {
      return sum + (parseFloat(log.work_hours) || 0);
    }, 0);
    
    return total.toFixed(2);
  };

  // 按日期分組工作日誌
  const groupLogsByDate = (logs) => {
    if (!Array.isArray(logs) || logs.length === 0) return {};
    
    const groups = {};
    logs.forEach(log => {
      const date = formatDate(log.created_at);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
    });
    
    // 計算每日工時
    Object.keys(groups).forEach(date => {
      groups[date].totalHours = calculateTotalHours(groups[date]);
    });
    
    return groups;
  };

  // 渲染工作日誌詳情彈窗
  const renderWorkLogDetail = () => {
    if (!detailModalOpen) return null;
    
    const totalHours = calculateTotalHours(detailData);
    const groupedLogs = groupLogsByDate(detailData);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="w-full max-w-4xl bg-gray-800 rounded-lg shadow-lg">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold">{detailTitle}</h2>
            <div className="flex space-x-2">
              <div className="text-sm text-gray-300 mr-4">
                找到 <span className="font-bold text-blue-400">{detailData.length}</span> 條記錄 
                {totalHours > 0 && (
                  <span className="ml-2">
                    總工時: <span className="font-bold text-blue-400">{totalHours}</span> 小時
                  </span>
                )}
              </div>
              <Button 
                onClick={() => setDetailModalOpen(false)}
                variant="secondary"
                className="px-2 py-1"
              >
                關閉
              </Button>
            </div>
          </div>
          
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {detailLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : detailError ? (
              <div className="p-4 bg-red-800 text-white rounded-lg">
                {detailError}
              </div>
            ) : detailData.length === 0 ? (
              <div className="text-center p-8 text-gray-400">
                沒有找到符合條件的工作日誌記錄
              </div>
            ) : (
              <div className="space-y-6">
                {Object.keys(groupedLogs).map(date => (
                  <Card key={date} className="overflow-hidden">
                    <div className="bg-gray-700 p-3 flex justify-between items-center">
                      <h3 className="font-semibold">{date}</h3>
                      <div className="text-sm">
                        <span className="text-gray-300">工時:</span> 
                        <span className="font-bold text-blue-400 ml-1">
                          {groupedLogs[date].totalHours} 小時
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-700">
                            <th className="p-3 text-left">使用者</th>
                            <th className="p-3 text-left">時間</th>
                            <th className="p-3 text-left">工時</th>
                            <th className="p-3 text-left">位置</th>
                            <th className="p-3 text-left">工作類別</th>
                            <th className="p-3 text-left">作物</th>
                            <th className="p-3 text-left">詳情</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedLogs[date].map((log, index) => (
                            <tr key={log.id || index} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}>
                              <td className="p-3">
                                {log.username || 'N/A'}
                              </td>
                              <td className="p-3">
                                {formatTime(log.start_time)} - {formatTime(log.end_time)}
                              </td>
                              <td className="p-3">
                                {log.work_hours} 小時
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
                                {log.details || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-700 flex justify-between">
            <div className="text-sm text-gray-400">
              搜尋條件: {Object.entries(filterParams).map(([key, value]) => (
                <span key={key} className="mr-2">{key}: {value}</span>
              ))}
            </div>
            <Button 
              onClick={() => setDetailModalOpen(false)}
              variant="secondary"
              className="px-4 py-2"
            >
              關閉
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return {
    showWorkLogDetail,
    renderWorkLogDetail,
    detailModalOpen,
    detailData,
    detailLoading,
    detailError
  };
};