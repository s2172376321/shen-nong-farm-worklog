// 位置：frontend/src/hooks/useWorkLog.js
import { useState } from 'react';
import { createWorkLog, searchWorkLogs, uploadCSV } from '../utils/api';

export const useWorkLog = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitWorkLog = async (workLogData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await createWorkLog(workLogData);
      setIsLoading(false);
      return response;
    } catch (err) {
      setError(err.response?.data?.message || '提交工作日誌失敗');
      setIsLoading(false);
      throw err;
    }
  };

  const submitCSV = async (csvFile) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await uploadCSV(csvFile);
      setIsLoading(false);
      return response;
    } catch (err) {
      setError(err.response?.data?.message || 'CSV 檔案上傳失敗');
      setIsLoading(false);
      throw err;
    }
  };

  const fetchWorkLogs = async (filters) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await searchWorkLogs(filters);
      setIsLoading(false);
      return response;
    } catch (err) {
      setError(err.response?.data?.message || '查詢工作日誌失敗');
      setIsLoading(false);
      throw err;
    }
  };

  return {
    submitWorkLog,
    submitCSV,
    fetchWorkLogs,
    isLoading,
    error
  };
};