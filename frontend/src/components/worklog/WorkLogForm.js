// 位置：frontend/src/components/worklog/WorkLogForm.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWorkLog } from '../../hooks/useWorkLog';
import { Button, Input, Card } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { fetchLocations, fetchWorkCategories, fetchProducts } from '../../utils/api';
import Papa from 'papaparse';

const WorkLogForm = () => {
  const { user } = useAuth();
  const { submitWorkLog, submitCSV, fetchWorkLogs, isLoading, error } = useWorkLog();
  
  // 基本表單數據
  const [workLog, setWorkLog] = useState({
    location_code: '',
    position_code: '',
    position_name: '',
    work_category_code: '',
    work_category_name: '',
    startTime: '',
    endTime: '',
    details: '',
    harvestQuantity: 0,
    product_id: '',
    product_name: '',
    product_quantity: 0
  });
  
  // 相關數據
  const [areas, setAreas] = useState([]);
  const [positions, setPositions] = useState([]);
  const [workCategories, setWorkCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // 使用者今日已提交的工作時段
  const [todayWorkLogs, setTodayWorkLogs] = useState([]);
  
  // 狀態控制
  const [selectedArea, setSelectedArea] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showHarvestQuantity, setShowHarvestQuantity] = useState(false);
  const [selectedProductCategory, setSelectedProductCategory] = useState('');
  const [remainingHours, setRemainingHours] = useState(8);
  
  // CSV 相關狀態
  const [uploadMethod, setUploadMethod] = useState('manual'); // 'manual' 或 'csv'
  const [csvFile, setCsvFile] = useState(null);
  const [csvError, setCsvError] = useState(null);
  const [csvSuccess, setCsvSuccess] = useState(null);

  // 使用 useCallback 和 useMemo 優化效能和避免不必要的重渲染
  const loadLocations = useCallback(async () => {
    try {
      const locationData = await fetchLocations();
      const uniqueAreas = [...new Set(locationData.map(item => item.區域名稱))];
      setAreas(uniqueAreas);
    } catch (err) {
      console.error('載入位置資料失敗', err);
    }
  }, []);

  const loadWorkCategories = useCallback(async () => {
    try {
      const categoryData = await fetchWorkCategories();
      setWorkCategories(categoryData);
    } catch (err) {
      console.error('載入工作類別資料失敗', err);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const productData = await fetchProducts();
      setProducts(productData);
    } catch (err) {
      console.error('載入產品資料失敗', err);
    }
  }, []);

  // 計算剩餘工作時數的記憶化函數
  const calculateRemainingHours = useCallback((logs) => {
    let totalMinutes = 0;
    
    logs.forEach(log => {
      const startTime = log.start_time.split(':');
      const endTime = log.end_time.split(':');
      
      const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
      const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
      
      // 排除午休時間
      if (startMinutes < 12 * 60 && endMinutes > 13 * 60) {
        totalMinutes += (endMinutes - startMinutes - 60);
      } else {
        totalMinutes += (endMinutes - startMinutes);
      }
    });
    
    const remainingMinutes = 480 - totalMinutes;
    return Math.max(0, remainingMinutes / 60).toFixed(2);
  }, []);

  // 載入資料的副作用
  useEffect(() => {
    loadLocations();
    loadWorkCategories();
    loadProducts();
  }, [loadLocations, loadWorkCategories, loadProducts]);

  // 載入今日工作日誌的副作用
  useEffect(() => {
    const loadTodayWorkLogs = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const logs = await fetchWorkLogs({ 
          startDate: today, 
          endDate: today 
        });
        
        setTodayWorkLogs(logs);
        
        // 計算剩餘工作時數
        const remaining = calculateRemainingHours(logs);
        setRemainingHours(remaining);
        
        // 設置下一個開始時間
        if (logs.length > 0) {
          const sortedLogs = [...logs].sort((a, b) => 
            new Date(`2000-01-01T${a.end_time}`) - new Date(`2000-01-01T${b.end_time}`)
          );
          
          const lastLog = sortedLogs[sortedLogs.length - 1];
          
          if (lastLog && lastLog.end_time) {
            // 如果最後一個日誌的結束時間是12:00，則設置下一個開始時間為13:00
            const nextStartTime = lastLog.end_time === '12:00' ? '13:00' : lastLog.end_time;
            setWorkLog(prev => ({ ...prev, startTime: nextStartTime }));
          }
        } else {
          // 如果沒有日誌，設置開始時間為工作日開始時間
          setWorkLog(prev => ({ ...prev, startTime: '07:30' }));
        }
      } catch (err) {
        console.error('載入今日工作日誌失敗', err);
      }
    };
    
    loadTodayWorkLogs();
  }, [fetchWorkLogs, calculateRemainingHours]);

  // 其餘方法（handleAreaChange, handlePositionChange等）保持不變

  // 省略部分實現，因為篇幅有限
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* 表單實現 */}
    </div>
  );
};

export default WorkLogForm;