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

// 使用 useCallback 包裝載入今日工作日誌的函數
const loadTodayWorkLogs = useCallback(async () => {
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
    
    // 設置下一個開始時間的邏輯保持不變
    if (logs.length > 0) {
      const sortedLogs = [...logs].sort((a, b) => 
        new Date(`2000-01-01T${a.end_time}`) - new Date(`2000-01-01T${b.end_time}`)
      );
      
      const lastLog = sortedLogs[sortedLogs.length - 1];
      
      if (lastLog && lastLog.end_time) {
        const nextStartTime = lastLog.end_time === '12:00' ? '13:00' : lastLog.end_time;
        setWorkLog(prev => ({ ...prev, startTime: nextStartTime }));
      }
    } else {
      setWorkLog(prev => ({ ...prev, startTime: '07:30' }));
    }
  } catch (err) {
    console.error('載入今日工作日誌失敗', err);
  }
}, []); // 空依賴數組

// 使用 useEffect 載入今日工作日誌
useEffect(() => {
  loadTodayWorkLogs();
}, [loadTodayWorkLogs]);


  // 處理區域選擇
  const handleAreaChange = (e) => {
    const selectedArea = e.target.value;
    setSelectedArea(selectedArea);
    
    // 依區域篩選位置
    const filteredPositions = areas.filter(item => item.區域名稱 === selectedArea);
    setPositions(filteredPositions);
    
    // 清除已選位置
    setWorkLog(prev => ({ ...prev, position_code: '', position_name: '' }));
  };

  // 處理位置選擇
  const handlePositionChange = (e) => {
    const positionCode = e.target.value;
    const selectedPosition = positions.find(p => p.位置代號 === positionCode);
    
    if (selectedPosition) {
      setWorkLog(prev => ({
        ...prev,
        position_code: positionCode,
        position_name: selectedPosition.位置名稱,
        location_code: selectedPosition.區域代號
      }));
    }
  };

  // 處理工作類別選擇
  const handleWorkCategoryChange = (e) => {
    const categoryCode = e.target.value;
    const selectedCategory = workCategories.find(c => c.工作內容代號 === categoryCode);
    
    if (selectedCategory) {
      setWorkLog(prev => ({
        ...prev,
        work_category_code: categoryCode,
        work_category_name: selectedCategory.工作內容名稱
      }));
      
      // 檢查是否需要顯示產品選擇器
      const costCategory = selectedCategory.成本類別;
      setShowProductSelector(costCategory === 1 || costCategory === 2);
      
      // 檢查是否為採收類別
      setShowHarvestQuantity(selectedCategory.工作內容名稱 === '採收');
      
      // 如果不需要產品選擇器，清除產品相關數據
      if (!(costCategory === 1 || costCategory === 2)) {
        setWorkLog(prev => ({
          ...prev,
          product_id: '',
          product_name: '',
          product_quantity: 0
        }));
      }
    }
  };

  // 處理產品類別選擇
  const handleProductCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedProductCategory(category);
    
    // 依類別篩選產品
    const filtered = products.filter(p => p.中分類.toString() === category);
    setFilteredProducts(filtered);
    
    // 清除已選產品
    setWorkLog(prev => ({
      ...prev,
      product_id: '',
      product_name: ''
    }));
  };

  // 處理產品選擇
  const handleProductChange = (e) => {
    const productId = e.target.value;
    const selectedProduct = products.find(p => p.商品編號 === productId);
    
    if (selectedProduct) {
      setWorkLog(prev => ({
        ...prev,
        product_id: productId,
        product_name: `${selectedProduct.商品編號} - ${selectedProduct.規格}`
      }));
    }
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
      const result = await submitCSV(csvFile);
      setCsvSuccess(result.message || '成功上傳 CSV 文件');
      setCsvFile(null);
      setCsvError(null);
    } catch (err) {
      setCsvError(err.response?.data?.message || 'CSV 上傳失敗');
    }
  };

  // 驗證時間選擇
  const validateTimeSelection = (startTime, endTime) => {
    if (!startTime || !endTime) return false;
    
    // 檢查是否在工作時間內 (07:30-16:30)
    const minWorkTime = new Date('2000-01-01T07:30');
    const maxWorkTime = new Date('2000-01-01T16:30');
    const lunchStart = new Date('2000-01-01T12:00');
    const lunchEnd = new Date('2000-01-01T13:00');
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    if (start < minWorkTime || end > maxWorkTime || start >= end) {
      return '時間必須在工作時間(07:30-16:30)內，且結束時間必須晚於開始時間';
    }
    
    // 檢查是否與午休時間重疊
    if ((start < lunchStart && end > lunchStart) || 
        (start >= lunchStart && start < lunchEnd)) {
      return '所選時間不能與午休時間(12:00-13:00)重疊';
    }
    
    // 檢查是否與已提交的時段重疊
    for (const log of todayWorkLogs) {
      const logStart = new Date(`2000-01-01T${log.start_time}`);
      const logEnd = new Date(`2000-01-01T${log.end_time}`);
      
      if ((start >= logStart && start < logEnd) || 
          (end > logStart && end <= logEnd) ||
          (start <= logStart && end >= logEnd)) {
        return '所選時間與已提交的時段重疊';
      }
    }
    
    return true;
  };

  // 提交表單
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 時間驗證
    const timeValidation = validateTimeSelection(workLog.startTime, workLog.endTime);
    if (timeValidation !== true) {
      alert(timeValidation);
      return;
    }
    
    // 採收需要填寫採收數量
    if (showHarvestQuantity && (!workLog.harvestQuantity || workLog.harvestQuantity <= 0)) {
      alert('請填寫採收重量');
      return;
    }
    
    // 產品需要填寫產品和數量
    if (showProductSelector && (!workLog.product_id || !workLog.product_quantity || workLog.product_quantity <= 0)) {
      alert('請選擇產品並填寫數量');
      return;
    }
    
    try {
      await submitWorkLog(workLog);
      
      // 重新載入今日日誌
      const today = new Date().toISOString().split('T')[0];
      const logs = await fetchWorkLogs({ 
        startDate: today, 
        endDate: today 
      });
      
      setTodayWorkLogs(logs);
      const remaining = calculateRemainingHours(logs);
      setRemainingHours(remaining);
      
      // 重置表單，保留位置和工作類別
      setWorkLog(prev => ({
        ...prev,
        startTime: prev.endTime, // 下一次開始時間為前一次的結束時間
        endTime: '',
        harvestQuantity: 0,
        product_quantity: 0,
        details: ''
      }));
      
      alert('工作日誌提交成功');
    } catch (err) {
      console.error('提交工作日誌失敗', err);
      alert(err.response?.data?.message || '提交工作日誌失敗');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">工作日誌登錄</h2>
        
        {/* 上傳方式切換 */}
        <div className="mb-6 flex justify-center space-x-4">
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
                  type="file" 
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="w-full bg-gray-700 text-white p-2 rounded-lg"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={!csvFile || isLoading}
              >
                {isLoading ? '上傳中...' : '上傳工作日誌'}
              </Button>
            </form>
          </Card>
        )}

        {/* 手動填寫區域 */}
        {uploadMethod === 'manual' && (
          <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 p-6 rounded-lg">
            {/* 通知區域 */}
            <Card className="mb-6 p-4 bg-blue-800">
              <h3 className="text-lg font-semibold mb-2">今日工作進度</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-300">已提交時段：</p>
                  {todayWorkLogs.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {todayWorkLogs.map((log, index) => (
                        <li key={index} className="text-gray-300">
                          {log.start_time} - {log.end_time} ({log.work_category_name} @ {log.position_name})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">尚未提交任何工作時段</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-300">今日剩餘工時：</p>
                  <p className="text-2xl font-bold text-yellow-400">{remainingHours} 小時</p>
                  {parseFloat(remainingHours) > 0 && (
                    <p className="text-red-400 text-sm mt-2">
                      請確保每日工作時間達到8小時
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {error && (
              <div className="bg-red-600 text-white p-4 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* 位置選擇 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">區域</label>
                <select
                  value={selectedArea}
                  onChange={handleAreaChange}
                  className="w-full bg-gray-700 text-white p-2 rounded-lg"
                  required
                >
                  <option value="">選擇區域</option>
                  {areas.map(area => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2">位置</label>
                <select
                  value={workLog.position_code}
                  onChange={handlePositionChange}
                  className="w-full bg-gray-700 text-white p-2 rounded-lg"
                  required
                  disabled={!selectedArea}
                >
                  <option value="">選擇位置</option>
                  {positions.map(pos => (
                    <option key={pos.位置代號} value={pos.位置代號}>
                      {pos.位置名稱}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 工作類別選擇 */}
            <div>
              <label className="block mb-2">工作類別</label>
              <select
                value={workLog.work_category_code}
                onChange={handleWorkCategoryChange}
                className="w-full bg-gray-700 text-white p-2 rounded-lg"
                required
              >
                <option value="">選擇工作類別</option>
                {workCategories.map(category => (
                  <option key={category.工作內容代號} value={category.工作內容代號}>
                    {category.工作內容名稱}
                  </option>
                ))}
              </select>
            </div>

            {/* 產品選擇（條件性顯示） */}
            {showProductSelector && (
              <div className="border border-gray-600 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">產品資訊</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2">產品類別</label>
                    <select
                      value={selectedProductCategory}
                      onChange={handleProductCategoryChange}
                      className="w-full bg-gray-700 text-white p-2 rounded-lg"
                      required
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
                  </div>
                  <div>
                    <label className="block mb-2">產品</label>
                    <select
                      value={workLog.product_id}
                      onChange={handleProductChange}
                      className="w-full bg-gray-700 text-white p-2 rounded-lg"
                      required
                      disabled={!selectedProductCategory}
                    >
                      <option value="">選擇產品</option>
                      {filteredProducts.map(product => (
                        <option key={product.商品編號} value={product.商品編號}>
                          {product.規格} ({product.單位})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2">數量</label>
                    <Input 
                      type="number"
                      value={workLog.product_quantity}
                      onChange={(e) => setWorkLog(prev => ({...prev, product_quantity: Number(e.target.value)}))}
                      placeholder="請輸入數量"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 採收重量（條件性顯示） */}
            {showHarvestQuantity && (
              <div>
                <label className="block mb-2">採收重量 (台斤)</label>
                <Input 
                  type="number"
                  value={workLog.harvestQuantity}
                  onChange={(e) => setWorkLog(prev => ({...prev, harvestQuantity: Number(e.target.value)}))}
                  placeholder="請輸入採收重量"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            )}

            {/* 時間選擇 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">開始時間</label>
                <Input 
                  type="time"
                  value={workLog.startTime}
                  onChange={(e) => setWorkLog(prev => ({...prev, startTime: e.target.value}))}
                  min="07:30"
                  max="16:30"
                  step="60"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">工作時間: 07:30-16:30</p>
              </div>
              <div>
                <label className="block mb-2">結束時間</label>
                <Input 
                  type="time"
                  value={workLog.endTime}
                  onChange={(e) => setWorkLog(prev => ({...prev, endTime: e.target.value}))}
                  min="07:30"
                  max="16:30"
                  step="60"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">午休時間(12:00-13:00)無法選擇</p>
              </div>
            </div>

            {/* 備註 */}
            <div>
              <label className="block mb-2">作業備註</label>
              <textarea 
                value={workLog.details}
                onChange={(e) => setWorkLog(prev => ({...prev, details: e.target.value}))}
                className="w-full p-2 bg-gray-700 text-white rounded-lg"
                placeholder="請輸入作業細節"
                rows={3}
              />
            </div>

            {/* 提交按鈕 */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '提交中...' : '提交工作日誌'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default WorkLogForm;