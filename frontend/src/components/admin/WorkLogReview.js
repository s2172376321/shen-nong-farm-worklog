// 位置：frontend/src/components/admin/WorkLogReview.js
import React, { useState, useEffect } from 'react';
import { Button } from '../ui';
import { searchWorkLogs, reviewWorkLog } from '../../utils/api';

const WorkLogReview = () => {
  const [workLogs, setWorkLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    status: 'pending',
    startDate: '',
    endDate: ''
  });

  // 载入待审核工作日志
  useEffect(() => {
    const loadWorkLogs = async () => {
      try {
        const data = await searchWorkLogs({
          status: filter.status,
          startDate: filter.startDate,
          endDate: filter.endDate
        });
        setWorkLogs(data);
        setIsLoading(false);
      } catch (err) {
        setError('载入工作日志失败');
        setIsLoading(false);
      }
    };

    loadWorkLogs();
  }, [filter]);

  // 审核工作日志
  const handleReviewWorkLog = async (workLogId, status) => {
    try {
      // 调用审核 API
      await reviewWorkLog(workLogId, status);
      
      // 更新本地状态
      setWorkLogs(workLogs.filter(log => log.id !== workLogId));
      setError(null);
    } catch (err) {
      setError('审核工作日志失败');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">工作日志审核</h1>

      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* 筛选器 */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2">状态</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({...filter, status: e.target.value})}
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            >
              <option value="pending">待审核</option>
              <option value="approved">已核准</option>
              <option value="rejected">已拒绝</option>
            </select>
          </div>
          <div>
            <label className="block mb-2">开始日期</label>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => setFilter({...filter, startDate: e.target.value})}
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            />
          </div>
          <div>
            <label className="block mb-2">结束日期</label>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => setFilter({...filter, endDate: e.target.value})}
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 工作日志列表 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        {workLogs.length === 0 ? (
          <p className="text-center text-gray-400">目前没有待审核的工作日志</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="p-3 text-left">日期</th>
                  <th className="p-3 text-left">使用者</th>
                  <th className="p-3 text-left">地点</th>
                  <th className="p-3 text-left">作物</th>
                  <th className="p-3 text-left">工作内容</th>
                  <th className="p-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {workLogs.map(log => (
                  <tr key={log.id} className="border-b border-gray-700">
                    <td className="p-3">{new Date(log.created_at).toLocaleDateString()}</td>
                    <td className="p-3">{log.username}</td>
                    <td className="p-3">{log.location}</td>
                    <td className="p-3">{log.crop}</td>
                    <td className="p-3">{log.details}</td>
                    <td className="p-3 space-x-2">
                      <Button 
                        onClick={() => handleReviewWorkLog(log.id, 'approved')}
                        className="px-2 py-1 text-sm"
                      >
                        核准
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => handleReviewWorkLog(log.id, 'rejected')}
                        className="px-2 py-1 text-sm"
                      >
                        拒绝
                      </Button>
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

export default WorkLogReview;