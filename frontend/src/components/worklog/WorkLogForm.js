// 位置：frontend/src/components/worklog/WorkLogForm.js
import React, { useState } from 'react';
import { useWorkLog } from '../../hooks/useWorkLog';
import { Button, Input } from '../ui';

const WORK_CATEGORIES = [
  '前置整理', '基肥翻土', '灌溉', '防蟲', 
  '施肥', '除草', '整枝', '種植', 
  '食農教育', '環境整潔', '擦雞蛋', 
  '撿雞蛋', '出貨準備', '伙食準備', 
  '採收', '加工領料', '加工入庫', 
  '屠宰', '屠宰前置作業'
];

const WorkLogForm = () => {
  const { submitWorkLog, isLoading, error } = useWorkLog();
  const [workLog, setWorkLog] = useState({
    location: '',
    crop: '',
    startTime: '',
    endTime: '',
    workCategories: [],
    details: '',
    harvestQuantity: 0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitWorkLog(workLog);
      // 重置表單或顯示成功訊息
      setWorkLog({
        location: '',
        crop: '',
        startTime: '',
        endTime: '',
        workCategories: [],
        details: '',
        harvestQuantity: 0
      });
    } catch (err) {
      // 錯誤處理已在 hook 中處理
      console.error('提交工作日誌失敗', err);
    }
  };

  const handleCategoryToggle = (category) => {
    setWorkLog(prev => ({
      ...prev,
      workCategories: prev.workCategories.includes(category)
        ? prev.workCategories.filter(c => c !== category)
        : [...prev.workCategories, category]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">工作日誌登錄</h2>
        
        {error && (
          <div className="bg-red-600 text-white p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">作業地點</label>
              <Input 
                value={workLog.location}
                onChange={(e) => setWorkLog(prev => ({...prev, location: e.target.value}))}
                placeholder="請輸入作業地點"
              />
            </div>
            <div>
              <label className="block mb-2">作物名稱</label>
              <Input 
                value={workLog.crop}
                onChange={(e) => setWorkLog(prev => ({...prev, crop: e.target.value}))}
                placeholder="請輸入作物名稱"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">開始時間</label>
              <Input 
                type="time"
                value={workLog.startTime}
                onChange={(e) => setWorkLog(prev => ({...prev, startTime: e.target.value}))}
              />
            </div>
            <div>
              <label className="block mb-2">結束時間</label>
              <Input 
                type="time"
                value={workLog.endTime}
                onChange={(e) => setWorkLog(prev => ({...prev, endTime: e.target.value}))}
              />
            </div>
          </div>

          <div>
            <label className="block mb-2">作業類別</label>
            <div className="grid grid-cols-4 gap-2">
              {WORK_CATEGORIES.map(category => (
                <Button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryToggle(category)}
                  variant={workLog.workCategories.includes(category) ? 'primary' : 'secondary'}
                  className="text-xs py-1"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-2">採收重量 (台斤)</label>
            <Input 
              type="number"
              value={workLog.harvestQuantity}
              onChange={(e) => setWorkLog(prev => ({...prev, harvestQuantity: Number(e.target.value)}))}
              placeholder="請輸入採收重量"
            />
          </div>

          <div>
            <label className="block mb-2">作業備註</label>
            <textarea 
              value={workLog.details}
              onChange={(e) => setWorkLog(prev => ({...prev, details: e.target.value}))}
              className="w-full p-2 bg-gray-700 text-white rounded-lg"
              placeholder="請輸入作業細節"
              rows={4}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? '提交中...' : '提交工作日誌'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default WorkLogForm;