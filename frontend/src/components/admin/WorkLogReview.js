// 位置：frontend/src/components/admin/WorkLogReview.js
import React, { useState, useEffect } from 'react';
import { Button, Card } from '../ui';  // 修正 Card 導入路徑
import { searchWorkLogs, reviewWorkLog } from '../../utils/api';
import { useWorkLogDetail } from '../../hooks/useWorkLogDetail';

const WorkLogReview = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    status: 'pending',
    date: new Date().toISOString().split('T')[0] // 預設為今天日期
  });
  
  // 使用 useWorkLogDetail hook 來顯示詳細日誌
  const { 
    showWorkLogDetail, 
    detailModalOpen, 
    detailLoading, 
    detailError, 
    detailData, 
    detailTitle, 
    handleReviewWorkLog,
    handleBatchReview,
    handleDateGroupReview,
    toggleGroupExpand,
    closeWorkLogDetail,
    formatTime,
    formatDate,
    groupedData,
    totalWorkHours,
    expandedGroups,
    reviewSuccess,
    reviewingLogId
  } = useWorkLogDetail();
  
  // 待審核數據統計
  const [pendingStats, setPendingStats] = useState({
    totalLogs: 0,
    byUser: {}
  });

  // 返回函數
  const handleGoBack = () => {
    window.history.back();
  };

  // 載入待審核數據統計
  useEffect(() => {
    const loadPendingStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 獲取待審核日誌
        const logs = await searchWorkLogs({
          status: 'pending'
        });
        
        // 組織數據
        if (Array.isArray(logs)) {
          // 計算總數
          const totalLogs = logs.length;
          
          // 按用戶統計
          const byUser = {};
          logs.forEach(log => {
            const userId = log.user_id;
            const username = log.username || 'Unknown';
            
            if (!byUser[userId]) {
              byUser[userId] = {
                username,
                count: 0,
                dates: {}
              };
            }
            
            byUser[userId].count++;
            
            // 按日期分組
            const date = new Date(log.created_at).toISOString().split('T')[0];
            if (!byUser[userId].dates[date]) {
              byUser[userId].dates[date] = 0;
            }
            byUser[userId].dates[date]++;
          });
          
          setPendingStats({
            totalLogs,
            byUser
          });
        }
      } catch (err) {
        console.error('載入待審核統計失敗:', err);
        setError('無法載入待審核統計數據');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPendingStats();
  }, []);

  // 處理日期變更
  const handleDateChange = (e) => {
    setFilter(prev => ({
      ...prev,
      date: e.target.value
    }));
  };

  // 處理狀態變更
  const handleStatusChange = (e) => {
    setFilter(prev => ({
      ...prev,
      status: e.target.value
    }));
  };

  // 查看特定用戶的特定日期工作日誌
  const handleViewUserDayLogs = (userId, username, date) => {
    // 使用 hook 顯示詳情彈窗
    showWorkLogDetail({
      userId,
      startDate: date,
      endDate: date,
      status: filter.status
    }, `${username} - ${date} 工作日誌`);
  };
  
  // 查看所有待審核日誌
  const handleViewAllPending = () => {
    showWorkLogDetail({
      status: 'pending'
    }, '所有待審核工作日誌');
  };
  
  // 查看特定日期所有待審核日誌
  const handleViewDatePending = (date) => {
    showWorkLogDetail({
      status: 'pending',
      startDate: date,
      endDate: date
    }, `${date} 待審核工作日誌`);
  };
  
  // 查看特定用戶所有待審核日誌
  const handleViewUserPending = (userId, username) => {
    showWorkLogDetail({
      status: 'pending',
      userId
    }, `${username} 待審核工作日誌`);
  };

  // 渲染工作日誌詳情彈窗
  const renderWorkLogDetail = () => {
    if (!detailModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="w-full max-w-4xl bg-gray-800 rounded-lg shadow-lg">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold">{detailTitle}</h2>
            <div className="flex space-x-2">
              <div className="text-sm text-gray-300 mr-4">
                找到 <span className="font-bold text-blue-400">{detailData.length}</span> 條記錄 
                {totalWorkHours > 0 && (
                  <span className="ml-2">
                    總工時: <span className="font-bold text-blue-400">{totalWorkHours}</span> 小時
                  </span>
                )}
              </div>
              <Button 
                onClick={closeWorkLogDetail}
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
                {/* 審核模式的批量操作 */}
                {filter.status === 'pending' && detailData.length > 0 && (
                  <div className="bg-blue-900 p-3 rounded-lg mb-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">批量審核</h3>
                      <div className="flex space-x-2">
                        <Button 
                          onClick={() => handleBatchReview(detailData.map(log => log.id), 'approved')}
                          className="bg-green-600 hover:bg-green-700 text-sm"
                          disabled={detailLoading}
                        >
                          全部核准
                        </Button>
                        <Button 
                          onClick={() => handleBatchReview(detailData.map(log => log.id), 'rejected')}
                          className="bg-red-600 hover:bg-red-700 text-sm"
                          disabled={detailLoading}
                        >
                          全部拒絕
                        </Button>
                      </div>
                    </div>
                    {reviewSuccess && (
                      <div className="mt-2 bg-green-700 p-2 rounded text-white text-sm">
                        審核操作成功完成
                      </div>
                    )}
                  </div>
                )}
                
                {Object.keys(groupedData).map(date => (
                  <Card key={date} className="overflow-hidden">
                    <div className="bg-gray-700 p-3 flex justify-between items-center cursor-pointer" 
                         onClick={() => toggleGroupExpand(date)}>
                      <h3 className="font-semibold">{date}</h3>
                      <div className="flex items-center">
                        <div className="text-sm mr-4">
                          <span className="text-gray-300">工時:</span> 
                          <span className="font-bold text-blue-400 ml-1">
                            {groupedData[date].totalHours} 小時
                          </span>
                          <span className="ml-3 text-gray-300">({groupedData[date].length} 筆記錄)</span>
                        </div>
                        {filter.status === 'pending' && (
                          <div className="flex space-x-2 mr-2">
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDateGroupReview(date, 'approved');
                              }}
                              className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                              disabled={detailLoading}
                            >
                              核准此日
                            </Button>
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDateGroupReview(date, 'rejected');
                              }}
                              className="bg-red-600 hover:bg-red-700 text-xs px-2 py-1"
                              disabled={detailLoading}
                            >
                              拒絕此日
                            </Button>
                          </div>
                        )}
                        <span className="text-sm">
                          {expandedGroups[date] ? '▼' : '►'}
                        </span>
                      </div>
                    </div>
                    
                    {expandedGroups[date] && (
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
                              {filter.status === 'pending' && (
                                <th className="p-3 text-left">操作</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {groupedData[date].map((log, index) => (
                              <tr key={log.id || index} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}>
                                <td className="p-3">
                                  {log.username || 'N/A'}
                                </td>
                                <td className="p-3">
                                  {formatTime(log.start_time)} - {formatTime(log.end_time)}
                                </td>
                                <td className="p-3">
                                  {log.work_hours || 'N/A'} 小時
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
                                <td className="p-3 max-w-xs truncate">
                                  {log.details || '無'}
                                </td>
                                {filter.status === 'pending' && (
                                  <td className="p-3 whitespace-nowrap">
                                    <div className="flex space-x-1">
                                      <Button 
                                        onClick={() => handleReviewWorkLog(log.id, 'approved')}
                                        className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                                        disabled={reviewingLogId === log.id || detailLoading}
                                      >
                                        核准
                                      </Button>
                                      <Button 
                                        onClick={() => handleReviewWorkLog(log.id, 'rejected')}
                                        className="bg-red-600 hover:bg-red-700 text-xs px-2 py-1"
                                        disabled={reviewingLogId === log.id || detailLoading}
                                      >
                                        拒絕
                                      </Button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
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
      {/* 添加返回按鈕 */}
      <div className="mb-4">
        <Button 
          onClick={handleGoBack}
          variant="secondary"
          className="flex items-center text-sm"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-1" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
              clipRule="evenodd" 
            />
          </svg>
          返回
        </Button>
      </div>
    
      <h1 className="text-2xl font-bold mb-6">工作日誌審核</h1>

      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* 篩選器 */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2">狀態</label>
            <select
              value={filter.status}
              onChange={handleStatusChange}
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            >
              <option value="pending">待審核</option>
              <option value="approved">已核准</option>
              <option value="rejected">已拒絕</option>
            </select>
          </div>
          <div>
            <label className="block mb-2">日期</label>
            <input
              type="date"
              value={filter.date}
              onChange={handleDateChange}
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button 
            onClick={() => showWorkLogDetail({
              status: filter.status,
              startDate: filter.date,
              endDate: filter.date
            }, `${filter.date} ${filter.status === 'pending' ? '待審核' : filter.status === 'approved' ? '已核准' : '已拒絕'}工作日誌`)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            查看工作日誌
          </Button>
        </div>
      </Card>

      {/* 待審核概覽 */}
      <Card className="p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex justify-between items-center">
          <span>待審核工作日誌概覽</span>
          <span className="text-sm bg-yellow-600 text-white px-2 py-1 rounded-full">
            {pendingStats.totalLogs} 待審核
          </span>
        </h2>
        
        {pendingStats.totalLogs === 0 ? (
          <p className="text-center text-gray-400 py-4">目前沒有待審核的工作日誌</p>
        ) : (
          <div>
            <Button 
              onClick={handleViewAllPending}
              className="mb-4 bg-blue-600 hover:bg-blue-700 w-full"
            >
              查看所有待審核工作日誌
            </Button>
            
            <h3 className="text-md font-semibold mb-2">按使用者分組</h3>
            <div className="space-y-2">
              {Object.entries(pendingStats.byUser).map(([userId, userInfo]) => (
                <div key={userId} className="bg-gray-800 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{userInfo.username}</h4>
                    <span className="text-sm bg-blue-600 text-white px-2 py-1 rounded-full">
                      {userInfo.count} 筆
                    </span>
                  </div>
                  
                  <Button 
                    onClick={() => handleViewUserPending(userId, userInfo.username)}
                    variant="secondary"
                    className="mb-2 w-full text-sm"
                  >
                    查看此使用者所有待審核工作日誌
                  </Button>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(userInfo.dates).map(([date, count]) => (
                      <Button 
                        key={date}
                        onClick={() => handleViewUserDayLogs(userId, userInfo.username, date)}
                        className="bg-gray-700 hover:bg-gray-600 text-sm"
                      >
                        {date} ({count})
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
      
      {/* 審核工作流程說明 */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-2">審核工作流程</h2>
        <p className="text-gray-300 mb-4">
          點擊「查看工作日誌」按鈕可以檢視特定日期和狀態的工作日誌。在工作日誌詳情中，您可以直接進行審核操作。
        </p>
        <div className="bg-gray-800 p-3 rounded-lg">
          <h3 className="font-medium mb-2">審核指南</h3>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>確認工作時間是否符合規定（每日8小時）</li>
            <li>檢查工作地點和工作類別是否填寫正確</li>
            <li>核對採收數量或使用產品是否合理</li>
            <li>對於不符合要求的工作日誌，請選擇「拒絕」</li>
          </ul>
        </div>
      </Card>
      
      {/* 渲染工作日誌詳情彈窗 */}
      {renderWorkLogDetail()}
    </div>
  );
};

export default WorkLogReview;