// 位置：frontend/src/components/worklog/WorkLogList.js
import React, { useState, useEffect } from 'react';
import { searchWorkLogs, exportWorkLogs } from '../../utils/api';
import { Button, Input } from '../ui';

const WorkLogList = () => {
  const [workLogs, setWorkLogs] = useState([]);
  const [filters, setFilters] = useState({
    location: '',
    crop: '',
    startDate: '',
    endDate: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadWorkLogs = async () => {
      try {
        const data = await searchWorkLogs(filters);
        setWorkLogs(data);
        setIsLoading(false);
      } catch (err) {
        setError('載入工作日誌失敗');
        setIsLoading(false);
      }
    };

    loadWorkLogs();
  }, [filters]);

  const handleExport = () => {
    exportWorkLogs(filters);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">工作日誌紀錄</h1>

      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* 搜尋表單 */}
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block mb-2">作業地點</label>
            <Input 
              value={filters.location}
              onChange={(e) => setFilters({...filters, location: e.target.value})}
              placeholder="搜尋作業地點"
            />
          </div>
          <div>
            <label className="block mb-2">作物名稱</label>
            <Input 
              value={filters.crop}
              onChange={(e) => setFilters({...filters, crop: e.target.value})}
              placeholder="搜尋作物名稱"
            />
          </div>
          <div>
            <label className="block mb-2">開始日期</label>
            <Input 
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            />
          </div>
          <div>
            <label className="block mb-2">結束日期</label>
            <Input 
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            />
          </div>
        </div>
        <div className="flex justify-end mt-4 space-x-4">
          <Button onClick={handleExport}>匯出CSV</Button>
        </div>
      </div>

      {/* 工作日誌列表 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        {workLogs.length === 0 ? (
          <p className="text-center text-gray-400">沒有符合條件的工作日誌</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="p-3 text-left">日期</th>
                  <th className="p-3 text-left">作業地點</th>
                  <th className="p-3 text-left">作物名稱</th>
                  <th className="p-3 text-left">開始時間</th>
                  <th className="p-3 text-left">結束時間</th>
                  <th className="p-3 text-left">狀態</th>
                </tr>
              </thead>
              <tbody>
                {workLogs.map(log => (
                  <tr key={log.id} className="border-b border-gray-700">
                    <td className="p-3">{new Date(log.created_at).toLocaleDateString()}</td>
                    <td className="p-3">{log.location}</td>
                    <td className="p-3">{log.crop}</td>
                    <td className="p-3">{log.start_time}</td>
                    <td className="p-3">{log.end_time}</td>
                    <td className="p-3">
                      {log.status === 'pending' && <span className="text-yellow-400">待審核</span>}
                      {log.status === 'approved' && <span className="text-green-400">已核准</span>}
                      {log.status === 'rejected' && <span className="text-red-400">已拒絕</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkLogList;