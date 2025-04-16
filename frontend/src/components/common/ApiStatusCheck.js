// 位置：frontend/src/components/common/ApiStatusCheck.js
import React from 'react';
import { useApiStatus } from '../../context/ApiStatusProvider';
import { Button, Card } from '../ui';

// API 狀態檢查視覺組件
const ApiStatusCheck = ({ onContinueAnyway }) => {
  const { isApiReady, isChecking, apiStatus, retryCheck, lastChecked } = useApiStatus();
  
  // 格式化最後檢查時間
  const formattedLastChecked = lastChecked 
    ? new Date(lastChecked).toLocaleTimeString() 
    : '尚未檢查';
  
  // 如果 API 已就緒，不顯示任何內容
  if (isApiReady) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full bg-gray-800 text-white p-6">
        <h2 className="text-xl font-bold mb-4">
          {isChecking ? '正在檢查系統連接...' : '系統連接問題'}
        </h2>
        
        {isChecking ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
          </div>
        ) : (
          <>
            <div className="bg-gray-700 p-4 rounded-lg mb-4">
              <p className="font-medium text-red-400">
                {apiStatus?.message || '無法連接到後端系統'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                請確認網絡連接並稍後再試。
              </p>
              {apiStatus?.error && (
                <details className="mt-2">
                  <summary className="text-sm text-gray-400 cursor-pointer">查看詳細錯誤</summary>
                  <p className="text-sm text-gray-400 mt-1 bg-gray-800 p-2 rounded">
                    {apiStatus.error}
                  </p>
                </details>
              )}
              <p className="text-sm text-gray-400 mt-2">
                最後檢查時間: {formattedLastChecked}
              </p>
            </div>
            
            <div className="flex flex-col space-y-3">
              <Button onClick={retryCheck} className="w-full">
                重新檢查連接
              </Button>
              
              {onContinueAnyway && (
                <Button 
                  onClick={onContinueAnyway} 
                  variant="secondary" 
                  className="w-full"
                >
                  仍然繼續使用應用
                </Button>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default ApiStatusCheck;