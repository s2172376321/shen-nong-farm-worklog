// 位置：frontend/src/components/common/LocationSelector.js
import React, { useState, useEffect } from 'react';
import { fetchLocationsByArea } from '../../utils/api';

const LocationSelector = ({ onLocationSelect, className = '' }) => {
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 載入區域和位置資料
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await fetchLocationsByArea();
        setAreas(data);
        setIsLoading(false);
      } catch (err) {
        console.error('載入位置資料失敗', err);
        setError('無法載入位置資料');
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // 當選擇區域時，更新位置列表
  const handleAreaChange = (e) => {
    const areaName = e.target.value;
    setSelectedArea(areaName);
    setSelectedLocation('');

    if (areaName) {
      const selectedAreaData = areas.find(area => area.areaName === areaName);
      setLocations(selectedAreaData?.locations || []);
    } else {
      setLocations([]);
    }
  };

  // 當選擇位置時，調用回調函數
  const handleLocationChange = (e) => {
    const locationCode = e.target.value;
    setSelectedLocation(locationCode);
    
    if (locationCode) {
      const selectedLocationData = locations.find(loc => loc.code === locationCode);
      onLocationSelect && onLocationSelect({
        areaName: selectedArea,
        locationCode,
        locationName: selectedLocationData?.name
      });
    }
  };

  if (isLoading) {
    return <div className="text-gray-400">載入中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 區域選擇 */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-1">
          選擇區域
        </label>
        <select
          value={selectedArea}
          onChange={handleAreaChange}
          className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">請選擇區域</option>
          {areas.map(area => (
            <option key={area.areaName} value={area.areaName}>
              {area.areaName}
            </option>
          ))}
        </select>
      </div>

      {/* 位置選擇 (只有當區域被選中時才顯示) */}
      {selectedArea && (
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">
            選擇位置
          </label>
          <select
            value={selectedLocation}
            onChange={handleLocationChange}
            className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">請選擇位置</option>
            {locations.map(location => (
              <option key={location.code} value={location.code}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;