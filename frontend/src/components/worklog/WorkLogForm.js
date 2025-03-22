// 位置：frontend/src/components/worklog/WorkLogForm.js
import React, { useState, useEffect } from 'react';
import { Button, Input, Card } from '../ui';
import { fetchLocationsByArea, fetchWorkCategories, fetchLocationCrops } from '../../utils/api';

const WorkLogForm = ({ onSubmitSuccess }) => {
  // 表單狀態
  const [formData, setFormData] = useState({
    position_code: '',
    position_name: '',
    work_category_code: '',
    work_category_name: '',
    start_time: '',
    end_time: '',
    details: '',
    crop: '',
    harvest_quantity: 0
  });
  
  // UI狀態
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [areas, setAreas] = useState([]);
  const [allLocationsData, setAllLocationsData] = useState([]);
  const [positions, setPositions] = useState([]);
  const [workCategories, setWorkCategories] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [showHarvestQuantity, setShowHarvestQuantity] = useState(false);
  
  // 載入基礎數據
  useEffect(() => {
    const loadBaseData = async () => {
      setIsLoading(true);
      try {
        // 讀取位置資料 - 使用 fetchLocationsByArea 替代 fetchLocations
        const locationData = await fetchLocationsByArea();
        if (Array.isArray(locationData)) {
          // 設置區域列表
          setAreas(locationData.map(area => area.areaName));
          // 保存完整位置數據供後續使用
          setAllLocationsData(locationData);
          console.log(`成功載入 ${locationData.length} 個區域數據`);
        } else {
          console.error('位置資料格式不正確', locationData);
        }
        
        // 讀取工作類別
        const categoryData = await fetchWorkCategories();
        if (Array.isArray(categoryData)) {
          setWorkCategories(categoryData);
          console.log(`成功載入 ${categoryData.length} 個工作類別`);
        } else {
          console.error('工作類別資料格式不正確', categoryData);
        }
      } catch (err) {
        console.error('載入基礎數據失敗:', err);
        setError('載入基礎數據失敗，請重新整理頁面');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBaseData();
  }, []);
  
  // 當區域變更時載入位置
  useEffect(() => {
    if (!selectedArea || !allLocationsData.length) {
      setPositions([]);
      return;
    }
    
    // 從完整數據中篩選當前區域的位置
    const areaData = allLocationsData.find(area => area.areaName === selectedArea);
    if (areaData && areaData.locations) {
      setPositions(areaData.locations);
      console.log(`區域 "${selectedArea}" 有 ${areaData.locations.length} 個位置`);
    } else {
      setPositions([]);
      console.warn(`未找到區域 "${selectedArea}" 的位置數據`);
    }
    
    // 清除已選位置
    setFormData(prev => ({ ...prev, position_code: '', position_name: '', crop: '' }));
    // 清除作物列表
    setCrops([]);
  }, [selectedArea, allLocationsData]);
  
  // 當位置變更時載入作物
  useEffect(() => {
    if (!formData.position_code) {
      setCrops([]);
      return;
    }
    
    const loadCrops = async () => {
      try {
        console.log(`開始載入位置 ${formData.position_code} 的作物列表...`);
        const cropData = await fetchLocationCrops(formData.position_code);
        if (Array.isArray(cropData)) {
          setCrops(cropData);
          console.log(`位置 ${formData.position_code} 有 ${cropData.length} 種作物`);
        } else {
          console.error('作物資料格式不正確', cropData);
          setCrops([]);
        }
      } catch (err) {
        console.error('載入作物列表失敗:', err);
        setCrops([]);
      }
    };
    
    loadCrops();
  }, [formData.position_code]);
  
  // 處理區域選擇
  const handleAreaChange = (e) => {
    const areaName = e.target.value;
    console.log('選擇區域:', areaName);
    setSelectedArea(areaName);
    setFormErrors(prev => ({ ...prev, area: null }));
  };
  
  // 處理位置選擇
  const handlePositionChange = (e) => {
    const positionCode = e.target.value;
    setFormErrors(prev => ({ ...prev, position: null }));
    
    if (!positionCode) {
      setFormData(prev => ({ ...prev, position_code: '', position_name: '' }));
      return;
    }
    
    console.log('選擇位置:', positionCode);
    
    // 從位置列表中找到選擇的位置
    const selectedPosition = positions.find(p => p.locationCode === positionCode);
    
    if (selectedPosition) {
      console.log('找到位置資料:', selectedPosition);
      setFormData(prev => ({
        ...prev,
        position_code: positionCode,
        position_name: selectedPosition.locationName || ''
      }));
    } else {
      console.warn('找不到匹配的位置:', positionCode);
      setFormData(prev => ({ ...prev, position_code: positionCode, position_name: '' }));
    }
  };
  
  // 處理工作類別選擇
  const handleWorkCategoryChange = (e) => {
    const categoryCode = e.target.value;
    setFormErrors(prev => ({ ...prev, work_category: null }));
    
    if (!categoryCode) {
      setFormData(prev => ({ ...prev, work_category_code: '', work_category_name: '' }));
      setShowHarvestQuantity(false);
      return;
    }
    
    // 從工作類別列表中找到選擇的類別
    const selectedCategory = workCategories.find(c => c.工作內容代號 === categoryCode);
    
    if (selectedCategory) {
      setFormData(prev => ({
        ...prev,
        work_category_code: categoryCode,
        work_category_name: selectedCategory.工作內容名稱 || ''
      }));
      
      // 檢查是否為採收類別
      const isHarvest = selectedCategory.工作內容名稱 === '採收';
      setShowHarvestQuantity(isHarvest);
    }
  };
  
  // 處理作物選擇
  const handleCropChange = (e) => {
    const crop = e.target.value;
    setFormData(prev => ({ ...prev, crop }));
    setFormErrors(prev => ({ ...prev, crop: null }));
  };
  
  // 處理文本輸入
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({ ...prev, [name]: null }));
  };
  
  // 處理數字輸入
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : Number(value);
    setFormData(prev => ({ ...prev, [name]: numValue }));
    setFormErrors(prev => ({ ...prev, [name]: null }));
  };
  
  // 驗證時間選擇
  const validateTimeSelection = (start_time, end_time) => {
    if (!start_time || !end_time) {
      return { valid: false, message: '請選擇開始和結束時間' };
    }
    
    // 檢查時間格式
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return { valid: false, message: '時間格式不正確' };
    }
    
    // 檢查工作時間範圍
    const start = new Date(`2000-01-01T${start_time}`);
    const end = new Date(`2000-01-01T${end_time}`);
    
    if (start >= end) {
      return { valid: false, message: '結束時間必須晚於開始時間' };
    }
    
    // 檢查午休時間
    const lunchStart = new Date('2000-01-01T12:00');
    const lunchEnd = new Date('2000-01-01T13:00');
    
    if ((start < lunchStart && end > lunchStart) || 
        (start >= lunchStart && start < lunchEnd)) {
      return { valid: false, message: '所選時間不能與午休時間(12:00-13:00)重疊' };
    }
    
    return { valid: true, message: '' };
  };
  
  // 表單驗證
  const validateForm = () => {
    const errors = {};
    
    // 必填欄位驗證
    if (!selectedArea) {
      errors.area = '請選擇區域';
    }
    
    if (!formData.position_code) {
      errors.position = '請選擇位置';
    }
    
    if (!formData.work_category_code) {
      errors.work_category = '請選擇工作類別';
    }
    
    if (!formData.crop) {
      errors.crop = '請選擇或輸入作物名稱';
    }
    
    // 時間欄位驗證
    const timeValidation = validateTimeSelection(formData.start_time, formData.end_time);
    if (!timeValidation.valid) {
      errors.time = timeValidation.message;
    }
    
    // 採收數量驗證
    if (showHarvestQuantity && formData.harvest_quantity <= 0) {
      errors.harvest_quantity = '請填寫採收重量';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 提交表單
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // API由props傳入或直接引入
      const response = await fetch('/api/work-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '提交工作日誌失敗');
      }
      
      const data = await response.json();
      
      // 重置表單
      setFormData({
        position_code: formData.position_code, // 保留位置
        position_name: formData.position_name,
        work_category_code: formData.work_category_code, // 保留工作類別
        work_category_name: formData.work_category_name,
        crop: formData.crop, // 保留作物
        start_time: formData.end_time, // 下一次開始時間為前一次的結束時間
        end_time: '',
        details: '',
        harvest_quantity: 0
      });
      
      setSuccess('工作日誌提交成功！');
      
      // 呼叫成功回調
      if (onSubmitSuccess) {
        onSubmitSuccess(data);
      }
    } catch (err) {
      setError(err.message || '提交工作日誌失敗，請稍後再試');
    } finally {
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
    <Card className="bg-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4">新增工作日誌</h2>
      
      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-600 text-white p-3 rounded-lg mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 區域和位置選擇 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2">區域 <span className="text-red-500">*</span></label>
            <select
              value={selectedArea}
              onChange={handleAreaChange}
              className={`w-full bg-gray-700 text-white p-2 rounded-lg ${
                formErrors.area ? 'border border-red-500' : ''
              }`}
              disabled={isLoading}
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
              value={formData.position_code}
              onChange={handlePositionChange}
              className={`w-full bg-gray-700 text-white p-2 rounded-lg ${
                formErrors.position ? 'border border-red-500' : ''
              }`}
              disabled={isLoading || !selectedArea}
            >
              <option value="">選擇位置</option>
              {positions.map(pos => (
                <option key={pos.locationCode} value={pos.locationCode}>
                  {pos.locationName}
                </option>
              ))}
            </select>
            {renderFieldError('position')}
          </div>
        </div>
        
        {/* 工作類別和作物選擇 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2">工作類別 <span className="text-red-500">*</span></label>
            <select
              value={formData.work_category_code}
              onChange={handleWorkCategoryChange}
              className={`w-full bg-gray-700 text-white p-2 rounded-lg ${
                formErrors.work_category ? 'border border-red-500' : ''
              }`}
              disabled={isLoading}
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
          
          <div>
            <label className="block mb-2">作物 <span className="text-red-500">*</span></label>
            <select
              value={formData.crop}
              onChange={handleCropChange}
              className={`w-full bg-gray-700 text-white p-2 rounded-lg ${
                formErrors.crop ? 'border border-red-500' : ''
              }`}
              disabled={isLoading || (!formData.position_code || crops.length === 0)}
            >
              <option value="">選擇作物</option>
              {crops.map(crop => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
            {renderFieldError('crop')}
            
            {/* 當沒有預設作物時，顯示手動輸入欄位 */}
            {formData.position_code && crops.length === 0 && (
              <Input
                type="text"
                name="crop"
                value={formData.crop}
                onChange={handleInputChange}
                placeholder="請手動輸入作物名稱"
                className="mt-2"
                disabled={isLoading}
              />
            )}
          </div>
        </div>
        
        {/* 時間選擇 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2">開始時間 <span className="text-red-500">*</span></label>
            <Input 
              type="time"
              name="start_time"
              value={formData.start_time}
              onChange={handleInputChange}
              min="07:30"
              max="16:30"
              className={formErrors.time ? 'border border-red-500' : ''}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-400 mt-1">工作時間: 07:30-16:30</p>
          </div>
          
          <div>
            <label className="block mb-2">結束時間 <span className="text-red-500">*</span></label>
            <Input 
              type="time"
              name="end_time"
              value={formData.end_time}
              onChange={handleInputChange}
              min="07:30"
              max="16:30"
              className={formErrors.time ? 'border border-red-500' : ''}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-400 mt-1">午休時間(12:00-13:00)不可選</p>
          </div>
          {renderFieldError('time')}
        </div>
        
        {/* 採收重量（條件性顯示） */}
        {showHarvestQuantity && (
          <div>
            <label className="block mb-2">採收重量 (台斤) <span className="text-red-500">*</span></label>
            <Input 
              type="number"
              name="harvest_quantity"
              value={formData.harvest_quantity || ''}
              onChange={handleNumberChange}
              placeholder="請輸入採收重量"
              min="0"
              step="0.01"
              className={formErrors.harvest_quantity ? 'border border-red-500' : ''}
              disabled={isLoading}
            />
            {renderFieldError('harvest_quantity')}
          </div>
        )}
        
        {/* 備註 */}
        <div>
          <label className="block mb-2">作業備註</label>
          <textarea 
            name="details"
            value={formData.details}
            onChange={handleInputChange}
            className="w-full p-2 bg-gray-700 text-white rounded-lg"
            placeholder="請輸入作業細節 (選填)"
            rows={3}
            disabled={isLoading}
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
          disabled={isLoading}
        >
          {isLoading ? '提交中...' : '提交工作日誌'}
        </Button>
      </form>
    </Card>
  );
};

export default WorkLogForm;