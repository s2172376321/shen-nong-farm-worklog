// 位置：frontend/src/components/worklog/WorkLogForm.js
import React, { useState, useEffect, useCallback } from 'react';
import { useWorkLog } from '../../hooks/useWorkLog';
import { Button, Input, Card } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { 
  fetchLocations, 
  fetchWorkCategories, 
  fetchProducts, 
  checkServerHealth,
  fetchLocationCrops 
} from '../../utils/api';

const WorkLogForm = ({ onSubmitSuccess }) => {
  const { user, logout } = useAuth();                                                                        
  const { submitWorkLog, uploadCSV, fetchWorkLogs, isLoading: apiLoading, error } = useWorkLog();
  
  // 添加本地 loading 狀態
  const [localLoading, setIsLoading] = useState(false);
  // 合併 loading 狀態
  const isLoading = apiLoading || localLoading;

  // 返回函數
  const handleGoBack = () => {
    window.history.back();
  };
  
  // 新增日期選擇狀態
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateWorkLogs, setDateWorkLogs] = useState([]);  // 存儲選定日期的日誌
  
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
    product_quantity: 0,
    crop: ''  // 新增作物欄位
  });
  
  // 相關數據
  const [areas, setAreas] = useState([]);
  const [allPositions, setAllPositions] = useState([]); // 儲存所有位置
  const [positions, setPositions] = useState([]); // 儲存篩選後的位置
  const [workCategories, setWorkCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [availableCrops, setAvailableCrops] = useState([]);

  // 使用者今日已提交的工作時段
  const [todayWorkLogs, setTodayWorkLogs] = useState([]);
  
  // 狀態控制
  const [selectedArea, setSelectedArea] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showHarvestQuantity, setShowHarvestQuantity] = useState(false);
  const [selectedProductCategory, setSelectedProductCategory] = useState('');
  const [remainingHours, setRemainingHours] = useState(8);
  const [seedProducts, setSeedProducts] = useState([]); // 儲存所有種子種苗產品
  const [productSearchTerm, setProductSearchTerm] = useState(''); // 搜索詞
  const [showProductDropdown, setShowProductDropdown] = useState(false); // 控制下拉列表顯示
  const [dataLoaded, setDataLoaded] = useState(false); // 追蹤基本數據載入狀態

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
        // 儲存所有位置數據
        setAllPositions(locationData);
      } else {
        console.error('位置資料格式不正確', locationData);
        setAreas([]);
        setAllPositions([]);
      }
    } catch (err) {
      console.error('載入位置資料失敗', err);
      setAreas([]);
      setAllPositions([]);
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
        // 儲存所有產品
        setProducts(productData);
        
        // 篩選出葉菜類和水果類種子種苗產品 (以2807和2808開頭)
        const seedData = productData.filter(product => {
          const productId = product.商品編號?.toString() || '';
          return productId.startsWith('2807') || productId.startsWith('2808');
        });
        
        console.log(`找到 ${seedData.length} 種種子種苗產品`);
        setSeedProducts(seedData);
      } else {
        console.error('產品資料格式不正確', productData);
        setProducts([]);
        setSeedProducts([]);
      }
    } catch (err) {
      console.error('載入產品資料失敗', err);
      setProducts([]);
      setSeedProducts([]);
    }
  }, []);

  const getFilteredProducts = useCallback(() => {
    if (!productSearchTerm.trim()) {
      return seedProducts.slice(0, 10); // 沒有搜索詞時顯示前10個結果
    }
    
    const searchTermLower = productSearchTerm.toLowerCase();
    
    // 搜索條件: 商品編號、規格或單位包含搜索詞
    return seedProducts.filter(product => {
      const productId = product.商品編號?.toString().toLowerCase() || '';
      const productSpec = product.規格?.toString().toLowerCase() || '';
      const productUnit = product.單位?.toString().toLowerCase() || '';
      
      return productId.includes(searchTermLower) || 
             productSpec.includes(searchTermLower) || 
             productUnit.includes(searchTermLower);
    }).slice(0, 10); // 限制顯示10個搜索結果
  }, [seedProducts, productSearchTerm]);

  // 處理產品搜索框輸入變化
  const handleProductSearchChange = (e) => {
    setProductSearchTerm(e.target.value);
    setShowProductDropdown(true);
    setFormErrors(prev => ({ ...prev, product: null }));
  };

  // 處理產品選擇
  const handleProductSelect = (product) => {
    const productName = `${product.商品編號} - ${product.規格 || ''} (${product.單位 || ''})`;
    setWorkLog(prev => ({
      ...prev,
      product_id: product.商品編號,
      product_name: productName
    }));
    setProductSearchTerm(productName);
    setShowProductDropdown(false);
    setFormErrors(prev => ({ ...prev, product: null }));
  };

  // 計算工作時長
  const calculateWorkHours = useCallback((logs) => {
    console.log("計算工時，日誌數量:", logs?.length, "日誌內容:", logs);
    
    if (!Array.isArray(logs) || logs.length === 0) {
      console.log("沒有日誌記錄或格式不正確，返回默認值");
      return { totalHours: 0, remainingHours: 8 };
    }
    
    let totalMinutes = 0;
    
    logs.forEach((log, index) => {
      if (!log.start_time || !log.end_time) {
        console.log(`日誌 #${index} 缺少開始或結束時間`, log);
        return;
      }
      
      console.log(`處理日誌 #${index}:`, {
        startTime: log.start_time,
        endTime: log.end_time
      });
      
      const startParts = log.start_time.split(':');
      const endParts = log.end_time.split(':');
      
      if (startParts.length !== 2 || endParts.length !== 2) {
        console.log(`日誌 #${index} 時間格式不正確`, {
          startParts,
          endParts
        });
        return;
      }
      
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      
      if (isNaN(startMinutes) || isNaN(endMinutes)) {
        console.log(`日誌 #${index} 時間轉換失敗`, {
          startMinutes,
          endMinutes
        });
        return;
      }
      
      // 計算該時段的分鐘數
      let logMinutes = endMinutes - startMinutes;
      
      // 排除午休時間 (12:00-13:00)
      if (startMinutes < 12 * 60 && endMinutes > 13 * 60) {
        logMinutes -= 60;
        console.log(`日誌 #${index} 跨越午休時間，扣除60分鐘`);
      } else if (startMinutes < 13 * 60 && endMinutes > 12 * 60 && endMinutes <= 13 * 60) {
        logMinutes -= (endMinutes - 12 * 60);
        console.log(`日誌 #${index} 部分占用午休時間，扣除${endMinutes - 12 * 60}分鐘`);
      } else if (startMinutes >= 12 * 60 && startMinutes < 13 * 60 && endMinutes > 13 * 60) {
        logMinutes -= (13 * 60 - startMinutes);
        console.log(`日誌 #${index} 部分占用午休時間，扣除${13 * 60 - startMinutes}分鐘`);
      } else if (startMinutes >= 12 * 60 && endMinutes <= 13 * 60) {
        logMinutes = 0; // 完全在午休時間內
        console.log(`日誌 #${index} 完全在午休時間內，不計入工時`);
      }
      
      console.log(`日誌 #${index} 計算結果: ${logMinutes}分鐘`);
      totalMinutes += logMinutes;
    });
    
    const totalHours = +(totalMinutes / 60).toFixed(2);
    const remainingHours = Math.max(0, +(8 - totalHours).toFixed(2));
    
    console.log("計算工時結果:", {
      totalMinutes,
      totalHours,
      remainingHours
    });
    
    return { totalHours, remainingHours };
  }, []);
  
  // 載入指定日期的工作日誌
  const loadDateWorkLogs = useCallback(async (date) => {
    try {
      console.log('正在載入指定日期工作日誌，日期:', date);
      
      const logs = await fetchWorkLogs({ 
        startDate: date, 
        endDate: date 
      });
      
      console.log('API返回的工作日誌原始數據:', logs);
      
      if (!Array.isArray(logs)) {
        console.error('工作日誌資料格式不正確', logs);
        setDateWorkLogs([]);
        setRemainingHours(8);
        return;
      }
      
      console.log(`成功載入 ${logs.length} 筆指定日期工作日誌`);
      
      // 標準化時間格式
      const normalizedLogs = logs.map(log => ({
        ...log,
        start_time: log.start_time?.substring(0, 5) || log.startTime?.substring(0, 5) || log.start_time || log.startTime,
        end_time: log.end_time?.substring(0, 5) || log.endTime?.substring(0, 5) || log.end_time || log.endTime
      }));
      
      console.log('標準化後的工作日誌:', normalizedLogs);
      setDateWorkLogs(normalizedLogs);
      
      // 如果是今天的日期，同時更新todayWorkLogs
      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        setTodayWorkLogs(normalizedLogs);
      }
      
      // 計算剩餘工時
      const { remainingHours } = calculateWorkHours(normalizedLogs);
      console.log('剩餘工時計算結果:', remainingHours);
      setRemainingHours(remainingHours);
      
      // 如果有紀錄，設置下一個開始時間為最後一條紀錄的結束時間
      if (normalizedLogs.length > 0) {
        const sortedLogs = [...normalizedLogs].sort((a, b) => {
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
      console.error('載入指定日期工作日誌失敗', err);
      setDateWorkLogs([]);
      setRemainingHours(8);
      setWorkLog(prev => ({ ...prev, startTime: '07:30' }));
    }
  }, [fetchWorkLogs, calculateWorkHours]);
  
  // 載入今日工作日誌
  const loadTodayWorkLogs = useCallback(async () => {
    // 直接使用loadDateWorkLogs加載當天的日誌
    const today = new Date().toISOString().split('T')[0];
    await loadDateWorkLogs(today);
  }, [loadDateWorkLogs]);

  // 處理日期變更
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    setFormErrors(prev => ({ ...prev, date: null }));
    loadDateWorkLogs(newDate);
  };

  // 只在組件掛載時載入一次基礎數據 (區域、類別、產品)
  useEffect(() => {
    if (!dataLoaded) {
      const loadBaseData = async () => {
        try {
          setIsLoading(true);
          setFormErrors({});
          await Promise.all([
            loadLocations(),
            loadWorkCategories(),
            loadProducts()
          ]);
          setDataLoaded(true);
          setIsLoading(false);
        } catch (error) {
          console.error('初始化基礎數據失敗', error);
          setIsLoading(false);
        }
      };
      
      loadBaseData();
    }
  }, [loadLocations, loadWorkCategories, loadProducts, dataLoaded]);

  // 日期變化時載入對應日期的工作日誌
  useEffect(() => {
    if (dataLoaded) {
      loadDateWorkLogs(selectedDate);
    }
  }, [loadDateWorkLogs, selectedDate, dataLoaded]);
  
  // 當區域變化時更新位置列表
  useEffect(() => {
    if (selectedArea) {
      const filteredPositions = allPositions.filter(pos => pos.區域名稱 === selectedArea);
      setPositions(filteredPositions);
    } else {
      setPositions([]);
    }
  }, [selectedArea, allPositions]);
  
  // 處理區域選擇
  const handleAreaChange = (e) => {
    const areaName = e.target.value;
    setSelectedArea(areaName);
    setFormErrors(prev => ({ ...prev, area: null }));
    
    // 清除已選位置
    setWorkLog(prev => ({ 
      ...prev, 
      position_code: '', 
      position_name: '',
      location_code: ''
    }));
  };

  // 處理位置選擇
  const handlePositionChange = async (e) => {
    const positionCode = e.target.value;
    setFormErrors(prev => ({ ...prev, position: null }));
    
    if (!positionCode) {
      setWorkLog(prev => ({ ...prev, position_code: '', position_name: '', location_code: '' }));
      setAvailableCrops([]); // 清空作物列表
      return;
    }
    
    // 從篩選後的位置列表中找到選擇的位置
    const selectedPosition = positions.find(p => p.位置代號 === positionCode);
    
    if (selectedPosition) {
      setWorkLog(prev => ({
        ...prev,
        position_code: positionCode,
        position_name: selectedPosition.位置名稱 || '',
        location_code: selectedPosition.區域代號 || '',
        // 清除作物選擇
        crop: ''
      }));
      
      // 加載該位置的作物列表
      try {
        const crops = await fetchLocationCrops(positionCode);
        console.log(`位置 ${positionCode} 的作物列表:`, crops);
        setAvailableCrops(crops);
      } catch (err) {
        console.error('加載作物列表失敗:', err);
        setAvailableCrops([]);
      }
    } else {
      console.warn('找不到匹配的位置:', positionCode);
      setWorkLog(prev => ({ ...prev, position_code: positionCode, position_name: '', location_code: '' }));
      setAvailableCrops([]);
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
      
      // 判斷是否為種植類別
      const isPlanting = selectedCategory.工作內容名稱 === '種植';
      
      // 檢查是否需要顯示產品選擇器
      const costCategory = selectedCategory.成本類別;
      const isProductNeeded = costCategory === 1 || costCategory === 2 || isPlanting;
      setShowProductSelector(isProductNeeded);
      
      // 重置產品選擇相關狀態
      if (isProductNeeded) {
        setProductSearchTerm('');
        setShowProductDropdown(false);
        
        // 如果是種植類別，直接過濾出種子種苗產品
        if (isPlanting) {
          setFilteredProducts([]);
          setSelectedProductCategory('');
        }
      } else {
        // 如果不需要產品，清除產品相關數據
        setWorkLog(prev => ({
          ...prev,
          product_id: '',
          product_name: '',
          product_quantity: 0
        }));
        setSelectedProductCategory('');
      }
      
      // 檢查是否為採收類別
      const isHarvest = selectedCategory.工作內容名稱 === '採收';
      setShowHarvestQuantity(isHarvest);
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

  // 處理作物選擇
  const handleCropChange = (e) => {
    const crop = e.target.value;
    setWorkLog(prev => ({ ...prev, crop }));
    setFormErrors(prev => ({ ...prev, crop: null }));
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
      setIsLoading(true); // 開始加載
      setCsvError(null);
      const result = await uploadCSV(csvFile);
      setCsvSuccess(result.message || '成功上傳 CSV 文件');
      setCsvFile(null);
      
      // 上傳成功後重新載入今日工作日誌
      await loadDateWorkLogs(selectedDate);
      
      // 重置文件上傳控件
      const fileInput = document.getElementById('csv-file-input');
      if (fileInput) fileInput.value = '';
      setIsLoading(false); // 結束加載

      // 呼叫父元件的成功回調
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err) {
      console.error('CSV 上傳失敗:', err);
      setCsvError(err.userMessage || err.message || 'CSV 上傳失敗');
      setIsLoading(false); // 確保錯誤時也結束加載
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
    
    // 使用選擇日期的日誌列表
    const logsToCheck = dateWorkLogs;
    
    // 增強檢查: 詳細檢查是否與已提交的時段重疊
    for (const log of logsToCheck) {
      // 確保時間格式一致
      if (!log.start_time || !log.end_time) continue;
      
      const logStart = new Date(`2000-01-01T${log.start_time}`);
      const logEnd = new Date(`2000-01-01T${log.end_time}`);
      
      // 檢查所有可能的重疊情況
      if ((start >= logStart && start < logEnd) || // 新開始在已有範圍內
          (end > logStart && end <= logEnd) ||     // 新結束在已有範圍內
          (start <= logStart && end >= logEnd)) {  // 新時段包含已有時段
        
        return { 
          valid: false, 
          message: `所選時間與已存在的時段「${log.start_time.substring(0, 5)}-${log.end_time.substring(0, 5)}」重疊` 
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

    // 作物驗證
    if (!workLog.crop) {
      errors.crop = '請選擇或輸入作物名稱';
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
      if (!selectedProductCategory && workLog.work_category_name !== '種植') {
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
  
  // 驗證認證狀態
  const token = localStorage.getItem('token');
  if (!token) {
    alert('您的登入狀態已失效，請重新登入');
    logout(); // 導向登入頁面
    return;
  }
  
  console.log('正在提交工作日誌，認證令牌存在:', !!token);
  
  // 表單驗證
  if (!validateForm()) {
    // 滾動到第一個錯誤欄位
    const firstError = document.querySelector('.border-red-500');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    console.log('表單驗證失敗，錯誤:', formErrors);
    return;
  }
  
  try {
    // 提交前禁用重複提交
    if (isLoading) return;
    setIsLoading(true);
    
    // 確保提交數據包含所有必要欄位
    const submitData = {
      location_code: workLog.location_code || '',
      position_code: workLog.position_code || '',
      position_name: workLog.position_name || '',
      work_category_code: workLog.work_category_code || '',
      work_category_name: workLog.work_category_name || '',
      startTime: workLog.startTime || '',  // 保持與後端一致的字段名
      endTime: workLog.endTime || '',      // 保持與後端一致的字段名
      details: workLog.details || '',
      harvestQuantity: workLog.harvestQuantity || 0,
      product_id: workLog.product_id || '',
      product_name: workLog.product_name || '',
      product_quantity: workLog.product_quantity || 0,
      crop: workLog.crop || '',
      date: selectedDate  // 明確添加日期字段
    };    
    console.log('提交工作日誌數據:', JSON.stringify(submitData, null, 2));
    
    const response = await submitWorkLog(submitData);
    console.log('工作日誌提交成功:', response);
    
    // 立即將成功提交的日誌添加到當前顯示的日誌列表中
    const submittedLog = {
      ...submitData,
      id: response.workLogId || Date.now(), // 使用返回的ID或臨時生成一個
      start_time: submitData.startTime,
      end_time: submitData.endTime,
      position_name: submitData.position_name,
      work_category_name: submitData.work_category_name,
      details: submitData.details,
      created_at: new Date().toISOString()
    };
    
    // 添加到日誌列表中
    const updatedLogs = [...dateWorkLogs, submittedLog];
    setDateWorkLogs(updatedLogs);
    
    // 如果是今天的日期，也更新 todayWorkLogs
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate === today) {
      setTodayWorkLogs(updatedLogs);
    }
    
    // 重新計算剩餘工時
    const { remainingHours } = calculateWorkHours(updatedLogs);
    setRemainingHours(remainingHours);
    
    // 為確保數據一致性，仍然從服務器重新載入日誌
    await loadDateWorkLogs(selectedDate);
    
    // 重置表單，但保留位置和工作類別
    const resetForm = {
      location_code: workLog.location_code,
      position_code: workLog.position_code,
      position_name: workLog.position_name,
      work_category_code: workLog.work_category_code,
      work_category_name: workLog.work_category_name,
      crop: workLog.crop, // 保留作物選擇
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
    setIsLoading(false);
    
    // 顯示成功訊息
    alert('工作日誌提交成功！');

    // 呼叫父元件的成功回調
    if (onSubmitSuccess) {
      onSubmitSuccess();
    }
  } catch (err) {
    console.error('提交工作日誌詳細錯誤:', {
      message: err.message,
      userMessage: err.userMessage,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      config: {
        url: err.config?.url,
        method: err.config?.method,
        headers: err.config?.headers ? '存在' : '不存在'
      }
    });
    
    // 處理特殊錯誤情況
    if (err.response?.status === 403) {
      alert('權限錯誤：您可能沒有提交工作日誌的權限或登入狀態已失效，請重新登入');
      // 可選：登出並重定向到登入頁面
      // logout();
    } else if (err.response?.status === 401) {
      alert('登入狀態已失效，請重新登入');
      logout(); // 登出並重定向到登入頁面
    } else {
      // 顯示錯誤訊息
      const errorMessage = err.userMessage || err.response?.data?.message || err.message || '提交工作日誌失敗，請檢查網路連線';
      alert(`提交失敗: ${errorMessage}`);
    }
    
    // 如果是驗證錯誤，更新表單錯誤
    if (err.validationErrors) {
      setFormErrors(prev => ({ ...prev, ...err.validationErrors }));
    }
    
    setIsLoading(false);
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
              <h3 className="text-lg font-semibold mb-2">
                {selectedDate === new Date().toISOString().split('T')[0] 
                  ? '今日工作進度' 
                  : `${selectedDate} 工作進度`}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-300">已提交時段：</p>
                  {dateWorkLogs.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {dateWorkLogs.map((log, index) => (
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
                  <p className="text-sm text-gray-300">剩餘工時：</p>
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
              {/* 新增日期選擇器 */}
              <div className="mb-4">
                <label className="block mb-2">工作日期 <span className="text-red-500">*</span></label>
                <Input 
                  type="date"
                  name="workDate"
                  value={selectedDate}
                  onChange={handleDateChange}
                  max={new Date().toISOString().split('T')[0]}  // 限制最大日期為今天
                  className={formErrors.date ? 'border border-red-500' : ''}
                />
                {renderFieldError('date')}
              </div>
              
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


              <div>
                <label className="block mb-2">作物 <span className="text-red-500">*</span></label>
                <select
                  value={workLog.crop}
                  onChange={handleCropChange}  
                  className={`w-full bg-gray-700 text-white p-2 rounded-lg ${
                    formErrors.crop ? 'border border-red-500' : ''
                  }`}
                  disabled={!workLog.position_code || availableCrops.length === 0}
                >
                  <option value="">選擇作物</option>
                  {availableCrops.map(crop => (
                    <option key={crop} value={crop}>{crop}</option>
                  ))}
                </select>
                {renderFieldError('crop')}
                {workLog.position_code && availableCrops.length === 0 && (
                  <p className="text-yellow-500 text-xs mt-1">
                    此位置沒有記錄種植作物，請手動輸入作物名稱或先記錄種植工作
                  </p>
                )}
                {/* 當沒有可用作物時顯示手動輸入欄位 */}
                {workLog.position_code && availableCrops.length === 0 && (
                  <Input
                    type="text"
                    value={workLog.crop}
                    onChange={(e) => setWorkLog(prev => ({ ...prev, crop: e.target.value }))}
                    placeholder="請手動輸入作物名稱"
                    className="mt-2"
                  />
                )}
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
                    {/* 如果是種植類別，直接顯示搜索框而不需要先選種類 */}
                    {workLog.work_category_name === '種植' ? (
                      <div className="md:col-span-2">
                        <label className="block mb-2">種子種苗產品 <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Input 
                            type="text"
                            value={productSearchTerm}
                            onChange={handleProductSearchChange}
                            placeholder="輸入關鍵字搜尋種子種苗..."
                            className={formErrors.product ? 'border border-red-500' : ''}
                            onFocus={() => setShowProductDropdown(true)}
                            onBlur={() => {
                              // 延遲關閉下拉框，使點擊事件能先觸發
                              setTimeout(() => setShowProductDropdown(false), 200);
                            }}
                          />
                          {showProductDropdown && getFilteredProducts().length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {getFilteredProducts().map(product => (
                                <div 
                                  key={product.商品編號}
                                  className="p-2 hover:bg-gray-700 cursor-pointer"
                                  onMouseDown={() => handleProductSelect(product)}
                                >
                                  <div className="font-medium">{product.商品編號} - {product.規格}</div>
                                  <div className="text-sm text-gray-400">單位: {product.單位}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {renderFieldError('product')}
                        <p className="text-xs text-gray-400 mt-1">
                          請輸入關鍵字搜尋葉菜類或水果類種子種苗
                        </p>
                      </div>
                    ) : (
                      // 原有的產品類別和產品選擇代碼保持不變
                      <>
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
                      </>
                    )}

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