// 位置：frontend/src/components/worklog/WorkLogForm.js
import React, { useState, useEffect, useCallback } from 'react';
import { useWorkLog } from '../../hooks/useWorkLog';
import { Button, Input, Card } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { fetchLocations, fetchWorkCategories, fetchProducts, checkServerHealth } from '../../utils/api';

const WorkLogForm = () => {
  const { user } = useAuth();
  const { submitWorkLog, uploadCSV, fetchWorkLogs, isLoading, error } = useWorkLog();
  
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
  
  // 表單驗證
  const [formErrors, setFormErrors] = useState({});
  const [serverStatus, setServerStatus] = useState({ status: 'unknown', message: '檢查連線中...' });
  
  // CSV 相關狀態
  const [uploadMethod, setUploadMethod] = useState('manual'); // 'manual' 或 'csv'
  const [csvFile, setCsvFile] = useState(null);
  const [csvError, setCsvError] = useState(null);
  const [csvSuccess, setCsvSuccess] = useState(null);

  // 檢查伺服器連線狀態
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await checkServerHealth();
        setServerStatus(status);
        console.log('伺服器狀態檢查結果:', status);
      } catch (err) {
        console.error('檢查伺服器狀態失敗:', err);
        setServerStatus({ status: 'offline', message: '無法連線到伺服器' });
      }
    };
    
    checkConnection();
    // 每30秒檢查一次
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // 加載位置數據
  const loadLocations = useCallback(async () => {
    try {
      const locationData = await fetchLocations();
      if (Array.isArray(locationData)) {
        // 提取唯一的區域名稱
        const uniqueAreas = [...new Set(locationData.map(item => item.區域名稱))].filter(Boolean);
        setAreas(uniqueAreas);
      } else {
        console.error('位置資料格式不正確', locationData);
        setAreas([]);
      }
    } catch (err) {
      console.error('載入位置資料失敗', err);
      setAreas([]);
    }
  }, []);

  // 加載工作類別
  const loadWorkCategories = useCallback(async () => {
    try {
      const categoryData = await fetchWorkCategories();
      if (Array.isArray(categoryData)) {
        setWorkCategories(categoryData);
      } else {
        console.error('工作類別資料格式不正確', categoryData);
        setWorkCategories([]);
      }
    } catch (err) {
      console.error('載入工作類別資料失敗', err);
      setWorkCategories([]);
    }
  }, []);

  // 加載產品數據
  const loadProducts = useCallback(async () => {
    try {
      const productData = await fetchProducts();
      if (Array.isArray(productData)) {
        setProducts(productData);
      } else {
        console.error('產品資料格式不正確', productData);
        setProducts([]);
      }
    } catch (err) {
      console.error('載入產品資料失敗', err);
      setProducts([]);
    }
  }, []);

  // 載入初始數據
  useEffect(() => {
    const loadData = async () => {
      try {
        setFormErrors({});
        await Promise.all([
          loadLocations(),
          loadWorkCategories(),
          loadProducts(),
          loadTodayWorkLogs()
        ]);
      } catch (error) {
        console.error('初始化數據失敗', error);
      }
    };
    
    loadData();
  }, [loadLocations, loadWorkCategories, loadProducts]);

  // 計算工作時長
  const calculateWorkHours = useCallback((logs) => {
    if (!Array.isArray(logs)) return { totalHours: 0, remainingHours: 8 };
    
    let totalMinutes = 0;
    
    logs.forEach(log => {
      if (!log.start_time || !log.end_time) return;
      
      const startParts = log.start_time.split(':');
      const endParts = log.end_time.split(':');
      
      if (startParts.length !== 2 || endParts.length !== 2) return;
      
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      
      if (isNaN(startMinutes) || isNaN(endMinutes)) return;
      
      // 排除午休時間 (12:00-13:00)
      if (startMinutes < 12 * 60 && endMinutes > 13 * 60) {
        totalMinutes += (endMinutes - startMinutes - 60);
      } else {
        totalMinutes += (endMinutes - startMinutes);
      }
    });
    
    const totalHours = +(totalMinutes / 60).toFixed(2);
    const remainingHours = Math.max(0, +(8 - totalHours).toFixed(2));
    
    return { totalHours, remainingHours };
  }, []);

  // 載入今日工作日誌
  const loadTodayWorkLogs = useCallback(async () => {
    try {
      // 使用當前日期作為過濾條件
      const today = new Date().toISOString().split('T')[0];
      console.log('正在載入今日工作日誌，日期:', today);
      
      const logs = await fetchWorkLogs({ 
        startDate: today, 
        endDate: today 
      });
      
      if (!Array.isArray(logs)) {
        console.error('工作日誌資料格式不正確', logs);
        setTodayWorkLogs([]);
        setRemainingHours(8);
        return;
      }
      
      console.log(`成功載入 ${logs.length} 筆今日工作日誌`);
      setTodayWorkLogs(logs);
      
      // 計算剩餘工時
      const { remainingHours } = calculateWorkHours(logs);
      setRemainingHours(remainingHours);
      
      // 如果有紀錄，設置下一個開始時間為最後一條紀錄的結束時間
      if (logs.length > 0) {
        const sortedLogs = [...logs].sort((a, b) => {
          const timeA = a.end_time ? new Date(`2000-01-01T${a.end_time}`) : 0;
          const timeB = b.end_time ? new Date(`2000-01-01T${b.end_time}`) : 0;
          return timeB - timeA; // 降序排列，最新的在前面
        });
        
        const latestLog = sortedLogs[0];
        if (latestLog && latestLog.end_time) {
          // 如果最後時間是12:00，則下一時段從13:00開始（午休時間跳過）
          const nextStartTime = latestLog.end_time === '12:00' ? '13:00' : latestLog.end_time;
          setWorkLog(prev => ({ ...prev, startTime: nextStartTime }));
          console.log('設置下一個開始時間為:', nextStartTime);
        } else {
          setWorkLog(prev => ({ ...prev, startTime: '07:30' }));
        }
      } else {
        // 沒有紀錄，從工作開始時間開始
        setWorkLog(prev => ({ ...prev, startTime: '07:30' }));
      }
    } catch (err) {
      console.error('載入今日工作日誌失敗', err);
      setTodayWorkLogs([]);
      setRemainingHours(8);
      setWorkLog(prev => ({ ...prev, startTime: '07:30' }));
    }
  }, [fetchWorkLogs, calculateWorkHours]);

  // 處理區域選擇
  const handleAreaChange = (e) => {
    const areaName = e.target.value;
    setSelectedArea(areaName);
    setFormErrors(prev => ({ ...prev, area: null }));
    
    // 依據選擇的區域篩選位置
    if (areaName) {
      // 從全部位置中篩選出屬於該區域的位置
      const filteredPositions = Array.isArray(positions) 
        ? positions.filter(pos => pos.區域名稱 === areaName)
        : [];
      setPositions(filteredPositions);
    } else {
      setPositions([]);
    }
    
    // 清除已選位置
    setWorkLog(prev => ({ ...prev, position_code: '', position_name: '' }));
  };

  // 處理位置選擇
  const handlePositionChange = (e) => {
    const positionCode = e.target.value;
    setFormErrors(prev => ({ ...prev, position: null }));
    
    if (!positionCode) {
      setWorkLog(prev => ({ ...prev, position_code: '', position_name: '', location_code: '' }));
      return;
    }
    
    // 從篩選後的位置列表中找到選擇的位置
    const selectedPosition = positions.find(p => p.位置代號 === positionCode);
    
    if (selectedPosition) {
      setWorkLog(prev => ({
        ...prev,
        position_code: positionCode,
        position_name: selectedPosition.位置名稱 || '',
        location_code: selectedPosition.區域代號 || ''
      }));
    } else {
      console.warn('找不到匹配的位置:', positionCode);
      setWorkLog(prev => ({ ...prev, position_code: positionCode, position_name: '', location_code: '' }));
    }
  };

  // 處理工作類別選擇
  const handleWorkCategoryChange = (e) => {
    const categoryCode = e.target.value;
    setFormErrors(prev => ({ ...prev, work_category: null }));
    
    if (!categoryCode) {
      setWorkLog(prev => ({ ...prev, work_category_code: '', work_category_name: '' }));
      setShowProductSelector(false);
      setShowHarvestQuantity(false);
      return;
    }
    
    // 從工作類別列表中找到選擇的類別
    const selectedCategory = workCategories.find(c => c.工作內容代號 === categoryCode);
    
    if (selectedCategory) {
      setWorkLog(prev => ({
        ...prev,
        work_category_code: categoryCode,
        work_category_name: selectedCategory.工作內容名稱 || ''
      }));
      
      // 檢查是否需要顯示產品選擇器
      const costCategory = selectedCategory.成本類別;
      const isProductNeeded = costCategory === 1 || costCategory === 2;
      setShowProductSelector(isProductNeeded);
      
      // 檢查是否為採收類別
      const isHarvest = selectedCategory.工作內容名稱 === '採收';
      setShowHarvestQuantity(isHarvest);
      
      // 如果不需要產品，清除產品相關數據
      if (!isProductNeeded) {
        setWorkLog(prev => ({
          ...prev,
          product_id: '',
          product_name: '',
          product_quantity: 0
        }));
        setSelectedProductCategory('');
      }
    } else {
      console.warn('找不到匹配的工作類別:', categoryCode);
      setWorkLog(prev => ({ ...prev, work_category_code: categoryCode, work_category_name: '' }));
      setShowProductSelector(false);
      setShowHarvestQuantity(false);
    }
  };

  // 處理產品類別選擇
  const handleProductCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedProductCategory(category);
    setFormErrors(prev => ({ ...prev, product_category: null }));
    
    if (!category) {
      setFilteredProducts([]);
      setWorkLog(prev => ({ ...prev, product_id: '', product_name: '' }));
      return;
    }
    
    // 依據產品類別篩選產品
    try {
      const filtered = products.filter(p => p.中分類 && p.中分類.toString() === category);
      setFilteredProducts(filtered);
      
      // 清除已選產品
      setWorkLog(prev => ({ ...prev, product_id: '', product_name: '' }));
    } catch (err) {
      console.error('篩選產品時發生錯誤:', err);
      setFilteredProducts([]);
    }
  };

  // 處理產品選擇
  const handleProductChange = (e) => {
    const productId = e.target.value;
    setFormErrors(prev => ({ ...prev, product: null }));
    
    if (!productId) {
      setWorkLog(prev => ({ ...prev, product_id: '', product_name: '' }));
      return;
    }
    
    // 從篩選後的產品列表中找到選擇的產品
    const selectedProduct = products.find(p => p.商品編號 === productId);
    
    if (selectedProduct) {
      const productName = `${selectedProduct.商品編號} - ${selectedProduct.規格 || ''}`;
      setWorkLog(prev => ({
        ...prev,
        product_id: productId,
        product_name: productName
      }));
    } else {
      console.warn('找不到匹配的產品:', productId);
      setWorkLog(prev => ({ ...prev, product_id: productId, product_name: '' }));
    }
  };

  // 處理數值輸入
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : Number(value);
    
    setWorkLog(prev => ({
      ...prev,
      [name]: numValue
    }));
    
    setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  // 處理時間輸入
  const handleTimeChange = (e) => {
    const { name, value } = e.target;
    setWorkLog(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({ ...prev, time: null }));
  };

  // 處理文本輸入
  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setWorkLog(prev => ({ ...prev, [name]: value }));
  };

  // 處理 CSV 文件選擇
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    setCsvFile(file);
    setCsvError(null);
    setCsvSuccess(null);
  };

  // 處理 CSV 文件上傳
  const handleCsvUpload = async (e) => {
    e.preventDefault();
    
    if (!csvFile) {
      setCsvError('請選擇 CSV 文件');
      return;
    }
    
    try {
      setCsvError(null);
      const result = await uploadCSV(csvFile);
      setCsvSuccess(result.message || '成功上傳 CSV 文件');
      setCsvFile(null);
      
      // 上傳成功後重新載入今日工作日誌
      await loadTodayWorkLogs();
      
      // 重置文件上傳控件
      const fileInput = document.getElementById('csv-file-input');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('CSV 上傳失敗:', err);
      setCsvError(err.userMessage || err.message || 'CSV 上傳失敗');
    }
  };

  // 驗證時間選擇
  const validateTimeSelection = (startTime, endTime) => {
    if (!startTime || !endTime) {
      return { valid: false, message: '請選擇開始和結束時間' };
    }
    
    // 檢查是否在工作時間內 (07:30-16:30)
    const minWorkTime = new Date('2000-01-01T07:30:00');
    const maxWorkTime = new Date('2000-01-01T16:30:00');
    const lunchStart = new Date('2000-01-01T12:00:00');
    const lunchEnd = new Date('2000-01-01T13:00:00');
    
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    if (start < minWorkTime || end > maxWorkTime) {
      return { valid: false, message: '時間必須在工作時間(07:30-16:30)內' };
    }
    
    if (start >= end) {
      return { valid: false, message: '結束時間必須晚於開始時間' };
    }
    
    // 檢查是否與午休時間重疊
    if ((start < lunchStart && end > lunchStart) || 
        (start >= lunchStart && start < lunchEnd)) {
      return { valid: false, message: '所選時間不能與午休時間(12:00-13:00)重疊' };
    }
    
    // 檢查是否與已提交的時段重疊
    for (const log of todayWorkLogs) {
      const logStart = new Date(`2000-01-01T${log.start_time}:00`);
      const logEnd = new Date(`2000-01-01T${log.end_time}:00`);
      
      if ((start >= logStart && start < logEnd) || 
          (end > logStart && end <= logEnd) ||
          (start <= logStart && end >= logEnd)) {
        return { 
          valid: false, 
          message: `所選時間與已存在的時段重疊：${log.start_time}-${log.end_time}` 
        };
      }
    }
    
    return { valid: true, message: '' };
  };

  // 驗證表單
  const validateForm = () => {
    const errors = {};
    
    // 必填欄位驗證
    if (!selectedArea) {
      errors.area = '請選擇區域';
    }
    
    if (!workLog.position_code) {
      errors.position = '請選擇位置';
    }
    
    if (!workLog.work_category_code) {
      errors.work_category = '請選擇工作類別';
    }
    
    // 時間欄位驗證
    const timeValidation = validateTimeSelection(workLog.startTime, workLog.endTime);
    if (!timeValidation.valid) {
      errors.time = timeValidation.message;
    }
    
    // 採收數量驗證
    if (showHarvestQuantity && (!workLog.harvestQuantity || workLog.harvestQuantity <= 0)) {
      errors.harvestQuantity = '請填寫採收重量';
    }
    
    // 產品相關驗證
    if (showProductSelector) {
      if (!selectedProductCategory) {
        errors.product_category = '請選擇產品類別';
      }
      
      if (!workLog.product_id) {
        errors.product = '請選擇產品';
      }
      
      if (!workLog.product_quantity || workLog.product_quantity <= 0) {
        errors.product_quantity = '請填寫產品數量';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 提交表單
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 檢查伺服器連線狀態
    if (serverStatus.status === 'offline') {
      alert('無法連線至伺服器，請稍後再試。');
      return;
    }
    
    // 表單驗證
    if (!validateForm()) {
      // 滾動到第一個錯誤欄位
      const firstError = document.querySelector('.border-red-500');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    try {
      // 提交前禁用重複提交
      if (isLoading) return;
      
      const response = await submitWorkLog(workLog);
      console.log('工作日誌提交成功:', response);
      
      // 重新載入今日日誌
      await loadTodayWorkLogs();
      
      // 重置表單，但保留位置和工作類別
      const resetForm = {
        location_code: workLog.location_code,
        position_code: workLog.position_code,
        position_name: workLog.position_name,
        work_category_code: workLog.work_category_code,
        work_category_name: workLog.work_category_name,
        startTime: workLog.endTime, // 下一次開始時間為前一次的結束時間
        endTime: '',
        details: '',
        harvestQuantity: 0,
        product_id: '',
        product_name: '',
        product_quantity: 0
      };
      
      setWorkLog(resetForm);
      setFormErrors({});
      
      // 顯示成功訊息
      alert('工作日誌提交成功！');
    } catch (err) {
      console.error('提交工作日誌失敗:', err);
      
      // 顯示錯誤訊息
      const errorMessage = err.userMessage || err.message || '提交工作日誌失敗，請檢查網路連線';
      alert(errorMessage);
      
      // 如果是驗證錯誤，更新表單錯誤
      if (err.validationErrors) {
        setFormErrors(prev => ({ ...prev, ...err.validationErrors }));
      }
    }
  };

  // 渲染欄位錯誤訊息
  const renderFieldError = (fieldName) => {
    if (formErrors[fieldName]) {
      return (
        <p className="text-red-500 text-xs mt-1">
          {formErrors[fieldName]}
        </p>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-center">工作日誌登錄</h2>
        
        {/* 伺服器連線狀態 */}
        {serverStatus.status !== 'online' && (
          <div className={`mb-4 p-3 rounded-lg text-center ${
            serverStatus.status === 'offline' ? 'bg-red-700' : 'bg-yellow-700'
          }`}>
            <p className="font-medium">{serverStatus.message}</p>
            {serverStatus.status === 'offline' && (
              <p className="text-sm mt-1">請檢查網路連線或聯絡系統管理員</p>
            )}
          </div>
        )}
        
        {/* 上傳方式切換 */}
        <div className="mb-4 flex justify-center space-x-4">
          <Button 
            onClick={() => setUploadMethod('manual')}
            variant={uploadMethod === 'manual' ? 'primary' : 'secondary'}
          >
            手動填寫
          </Button>
          <Button 
            onClick={() => setUploadMethod('csv')}
            variant={uploadMethod === 'csv' ? 'primary' : 'secondary'}
          >
            CSV 上傳
          </Button>
        </div>

        {/* CSV 上傳區域 */}
        {uploadMethod === 'csv' && (
          <Card className="mb-6 p-6">
            <h3 className="text-xl font-semibold mb-4">CSV 工作日誌上傳</h3>
            
            {csvError && (
              <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
                {csvError}
              </div>
            )}
            
            {csvSuccess && (
              <div className="bg-green-600 text-white p-3 rounded-lg mb-4">
                {csvSuccess}
              </div>
            )}
            
            <form onSubmit={handleCsvUpload} className="space-y-4">
              <div>
                <label className="block mb-2">選擇 CSV 文件</label>
                <input 
                  id="csv-file-input"
                  type="file" 
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="w-full bg-gray-700 text-white p-2 rounded-lg"
                />
                <p className="text-xs text-gray-400 mt-1">
                  CSV 格式：位置代號,工作類別代號,開始時間,結束時間,備註
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={!csvFile || isLoading}
              >
                {isLoading ? '上傳中...' : '上傳工作日誌'}
              </Button>
            </form>
            
            {/* CSV 範例說明 */}
            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <h4 className="font-medium mb-2">CSV 格式說明</h4>
              <p className="text-sm text-gray-300">必須包含以下欄位：</p>
              <ul className="list-disc list-inside text-xs text-gray-400 mt-1">
                <li>position_code - 位置代號</li>
                <li>work_category_code - 工作類別代號</li>
                <li>start_time - 開始時間 (格式: HH:MM)</li>
                <li>end_time - 結束時間 (格式: HH:MM)</li>
                <li>details - 備註 (選填)</li>
              </ul>
            </div>
          </Card>
        )}

        {/* 手動填寫區域 */}
        {uploadMethod === 'manual' && (
          <div>
            {/* 通知區域 */}
            <Card className="mb-4 p-4 bg-blue-900">
              <h3 className="text-lg font-semibold mb-2">今日工作進度</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-300">已提交時段：</p>
                  {todayWorkLogs.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {todayWorkLogs.map((log, index) => (
                        <li key={index} className="text-gray-300 text-sm">
                          {log.start_time} - {log.end_time} ({log.work_category_name || '未知類別'} @ {log.position_name || '未知位置'})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 text-sm">尚未提交任何工作時段</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-300">今日剩餘工時：</p>
                  <p className="text-2xl font-bold text-yellow-400">{remainingHours} 小時</p>
                  {parseFloat(remainingHours) > 0 && (
                    <p className="text-red-400 text-sm mt-1">
                      {parseFloat(remainingHours) < 8 ? '繼續加油！' : '請確保每日工作時間達到8小時'}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* 全局錯誤顯示 */}
            {error && (
              <div className="bg-red-600 text-white p-4 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* 表單 */}
            <form onSubmit={handleSubmit} className="space-y-4 bg-gray-800 p-4 rounded-lg">
              {/* 位置選擇 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2">區域 <span className="text-red-500">*</span></label>
                  <select
                    value={selectedArea}
                    onChange={handleAreaChange}
                    className={`w-full bg-gray-700 text-white p-2 rounded-lg ${
                      formErrors.area ? 'border border-red-500' : ''
                    }`}
                  >
                    <option value="">選擇區域</option>
                    {areas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                  {renderFieldError('area')}
                </div>
                <div>
                  <label className="block mb-2">位置 <span className="text-red-500">*</span></label>
                  <select
                    value={workLog.position_code}
                    onChange={handlePositionChange}
                    className={`w-full bg-gray-700 text-white p-2 rounded-lg ${
                      formErrors.position ? 'border border-red-500' : ''
                    }`}
                    disabled={!selectedArea}
                  >
                    <option value="">選擇位置</option>
                    {positions.map(pos => (
                      <option key={pos.位置代號} value={pos.位置代號}>
                        {pos.位置名稱}
                      </option>
                    ))}
                  </select>
                  {renderFieldError('position')}
                </div>
              </div>

              {/* 工作類別選擇 */}
              <div>
                <label className="block mb-2">工作類別 <span className="text-red-500">*</span></label>
                <select
                  value={workLog.work_category_code}
                  onChange={handleWorkCategoryChange}
                  className={`w-full bg-gray-700 text-white p-2 rounded-lg ${
                    formErrors.work_category ? 'border border-red-500' : ''
                  }`}
                >
                  <option value="">選擇工作類別</option>
                  {workCategories.map(category => (
                    <option key={category.工作內容代號} value={category.工作內容代號}>
                      {category.工作內容名稱}
                    </option>
                  ))}
                </select>
                {renderFieldError('work_category')}
              </div>

              {/* 產品選擇（條件性顯示） */}
              {showProductSelector && (
                <div className="border border-gray-600 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">產品資訊</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2">產品類別 <span className="text-red-500">*</span></label>
                      <select
                        value={selectedProductCategory}
                        onChange={handleProductCategoryChange}
                        className={`w-full bg-gray-700 text-white p-2 rounded-lg ${
                          formErrors.product_category ? 'border border-red-500' : ''
                        }`}
                      >
                        <option value="">選擇產品類別</option>
                        <option value="801">葉菜類</option>
                        <option value="802">水果類</option>
                        <option value="803">瓜果類</option>
                        <option value="804">家禽類</option>
                        <option value="805">魚類</option>
                        <option value="806">加工品類</option>
                        <option value="807">葉菜種子種苗</option>
                        <option value="808">水果種子種苗</option>
                        <option value="809">肥料</option>
                        <option value="810">資材</option>
                        <option value="811">飼料</option>
                      </select>
                      {renderFieldError('product_category')}
                    </div>
                    <div>
                      <label className="block mb-2">產品 <span className="text-red-500">*</span></label>
                      <select
                        value={workLog.product_id}
                        onChange={handleProductChange}
                        className={`w-full bg-gray-700 text-white p-2 rounded-lg ${
                          formErrors.product ? 'border border-red-500' : ''
                        }`}
                        disabled={!selectedProductCategory}
                      >
                        <option value="">選擇產品</option>
                        {filteredProducts.map(product => (
                          <option key={product.商品編號} value={product.商品編號}>
                            {product.規格} ({product.單位})
                          </option>
                        ))}
                      </select>
                      {renderFieldError('product')}
                    </div>
                    <div>
                      <label className="block mb-2">數量 <span className="text-red-500">*</span></label>
                      <Input 
                        type="number"
                        name="product_quantity"
                        value={workLog.product_quantity || ''}
                        onChange={handleNumberChange}
                        placeholder="請輸入數量"
                        min="0"
                        step="0.01"
                        className={formErrors.product_quantity ? 'border border-red-500' : ''}
                      />
                      {renderFieldError('product_quantity')}
                    </div>
                  </div>
                </div>
              )}

              {/* 採收重量（條件性顯示） */}
              {showHarvestQuantity && (
                <div>
                  <label className="block mb-2">採收重量 (台斤) <span className="text-red-500">*</span></label>
                  <Input 
                    type="number"
                    name="harvestQuantity"
                    value={workLog.harvestQuantity || ''}
                    onChange={handleNumberChange}
                    placeholder="請輸入採收重量"
                    min="0"
                    step="0.01"
                    className={formErrors.harvestQuantity ? 'border border-red-500' : ''}
                  />
                  {renderFieldError('harvestQuantity')}
                </div>
              )}

              {/* 時間選擇 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2">開始時間 <span className="text-red-500">*</span></label>
                  <Input 
                    type="time"
                    name="startTime"
                    value={workLog.startTime}
                    onChange={handleTimeChange}
                    min="07:30"
                    max="16:30"
                    className={formErrors.time ? 'border border-red-500' : ''}
                  />
                  <p className="text-xs text-gray-400 mt-1">工作時間: 07:30-16:30</p>
                </div>
                <div>
                  <label className="block mb-2">結束時間 <span className="text-red-500">*</span></label>
                  <Input 
                    type="time"
                    name="endTime"
                    value={workLog.endTime}
                    onChange={handleTimeChange}
                    min="07:30"
                    max="16:30"
                    className={formErrors.time ? 'border border-red-500' : ''}
                  />
                  <p className="text-xs text-gray-400 mt-1">午休時間(12:00-13:00)不可選</p>
                </div>
                {renderFieldError('time')}
              </div>

              {/* 備註 */}
              <div>
                <label className="block mb-2">作業備註</label>
                <textarea 
                  name="details"
                  value={workLog.details}
                  onChange={handleTextChange}
                  className="w-full p-2 bg-gray-700 text-white rounded-lg"
                  placeholder="請輸入作業細節 (選填)"
                  rows={3}
                />
              </div>

              {/* 必填欄位提示 */}
              <div className="text-sm text-gray-400">
                <span className="text-red-500">*</span> 表示必填欄位
              </div>

              {/* 提交按鈕 */}
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading || serverStatus.status === 'offline'}
              >
                {isLoading ? '提交中...' : '提交工作日誌'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkLogForm;