// 位置：src/components/common/LocationSelector.js
import React, { useState, useEffect } from 'react';
import { fetchLocationsByArea } from '../../utils/api';
import { Button } from '../ui';

const LocationSelector = ({ 
  onLocationSelect, 
  className = '', 
  disabled = false 
}) => {
  const [locations, setLocations] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await fetchLocationsByArea();
        setLocations(data);
        setError(null);
      } catch (err) {
        console.error('載入位置資料失敗', err);
        setError('無法載入位置資料，請稍後再試');
        
        // 使用備用數據
        const backupLocations = [
          {
            areaName: 'A區',
            locations: [
              { locationCode: 'A01', locationName: '農場A01' },
              { locationCode: 'A02', locationName: '農場A02' }
            ]
          },
          {
            areaName: 'B區',
            locations: [
              { locationCode: 'B01', locationName: '農場B01' },
              { locationCode: 'B02', locationName: '農場B02' }
            ]
          }
        ];
        setLocations(backupLocations);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAreaSelect = (area) => {
    setSelectedArea(area);
    setSelectedLocation(null);
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    onLocationSelect && onLocationSelect(location);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 區域選擇 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">選擇區域</h3>
        <div className="grid grid-cols-3 gap-2">
          {locations.map((area) => (
            <Button
              key={area.areaName}
              onClick={() => handleAreaSelect(area)}
              variant={selectedArea === area ? 'primary' : 'secondary'}
              className="w-full"
              disabled={disabled}
            >
              {area.areaName}
            </Button>
          ))}
        </div>
      </div>

      {/* 位置選擇 */}
      {selectedArea && (
        <div>
          <h3 className="text-lg font-semibold mb-2">選擇具體位置</h3>
          <div className="grid grid-cols-3 gap-2">
            {selectedArea.locations.map((location) => (
              <Button
                key={location.locationCode}
                onClick={() => handleLocationSelect(location)}
                variant={
                  selectedLocation === location ? 'primary' : 'secondary'
                }
                className="w-full"
                disabled={disabled}
              >
                {location.locationName}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;