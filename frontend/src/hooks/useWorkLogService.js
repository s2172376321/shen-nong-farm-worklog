// 位置：frontend/src/hooks/useWorkLogService.js
import { useState, useCallback } from 'react';
import { 
  getWorkLogsByDate,
  getTodayWorkHours,
  createWorkLog, 
  uploadCSV 
} from '../utils/api';

/**
 * 工作日誌服務 Hook
 * 提供簡化的工作日誌操作函數
 */
export const useWorkLogService = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 根據日期查詢工作日誌
   * @param {string} date - YYYY-MM-DD 格式的日期
   */
  const fetchWorkLogsByDate = useCallback(async (date) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const queryDate = date || today;
      
      console.log(`查詢日期 ${queryDate} 的工作日誌`);
      const logs = await getWorkLogsByDate(queryDate);
      
      setIsLoading(false);
      return logs;
    } catch (err) {
      console.error('查詢工作日誌失敗:', err);
      setError('查詢工作日誌失敗，請稍後再試');
      setIsLoading(false);
      return [];
    }
  }, []);

  /**
   * 獲取今日工時統計
   */
  const fetchTodayWorkHours = useCallback(async () => {
    try {
      return await getTodayWorkHours();
    } catch (err) {
      console.error('獲取工時統計失敗:', err);
      return {
        total_hours: "0.00",
        remaining_hours: "8.00",
        is_complete: false
      };
    }
  }, []);

  /**
   * 提交工作日誌
   * @param {Object} workLogData - 工作日誌數據
   */
  const submitWorkLog = useCallback(async (workLogData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('提交工作日誌:', workLogData);
      
      // 確保數據完整性
      if (!workLogData.startTime && !workLogData.start_time) {
        throw new Error('缺少開始時間');
      }
      if (!workLogData.endTime && !workLogData.end_time) {
        throw new Error('缺少結束時間');
      }
      
      const response = await createWorkLog(workLogData);
      setIsLoading(false);
      return response;
    } catch (err) {
      console.error('提交工作日誌失敗:', err);
      
      // 使用者友好的錯誤訊息
      let userMessage = '提交工作日誌失敗';
      
      if (err.response) {
        userMessage = err.response.data?.message || userMessage;
      } else if (err.request) {
        userMessage = '無法連接到伺服器，請檢查網路連接';
      } else {
        userMessage = err.message || userMessage;
      }
      
      setError(userMessage);
      setIsLoading(false);
      throw { ...err, userMessage };
    }
  }, []);

  /**
   * 上傳 CSV 文件
   * @param {File} csvFile - CSV 文件
   */
  const submitCSV = useCallback(async (csvFile) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!csvFile) {
        throw new Error('未選擇 CSV 文件');
      }
      
      const response = await uploadCSV(csvFile);
      setIsLoading(false);
      return response;
    } catch (err) {
      console.error('上傳 CSV 失敗:', err);
      setError(err.response?.data?.message || '上傳 CSV 失敗');
      setIsLoading(false);
      throw err;
    }
  }, []);

  return {
    isLoading,
    error,
    fetchWorkLogsByDate,
    fetchTodayWorkHours,
    submitWorkLog,
    submitCSV
  };
};

export default useWorkLogService;