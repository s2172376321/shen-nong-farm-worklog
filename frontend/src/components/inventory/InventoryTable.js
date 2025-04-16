// 位置：frontend/src/components/inventory/InventoryTable.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui';
import QuantityAdjustModal from './QuantityAdjustModal';
import { useAuth } from '../../context/AuthContext';

const InventoryTable = ({ items, onItemUpdated }) => {
  const { user } = useAuth();
  const [adjustItem, setAdjustItem] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: 'product_id',
    direction: 'ascending'
  });
  
  // 排序功能
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // 應用排序
  const sortedItems = [...items].sort((a, b) => {
    if (a[sortConfig.key] === null) return 1;
    if (b[sortConfig.key] === null) return -1;
    
    let valueA = a[sortConfig.key];
    let valueB = b[sortConfig.key];
    
    // 數值型欄位特殊處理
    if (sortConfig.key === 'current_quantity' || sortConfig.key === 'min_quantity') {
      valueA = parseFloat(valueA) || 0;
      valueB = parseFloat(valueB) || 0;
    } else {
      valueA = typeof valueA === 'string' ? valueA.toLowerCase() : valueA;
      valueB = typeof valueB === 'string' ? valueB.toLowerCase() : valueB;
    }
    
    if (valueA < valueB) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (valueA > valueB) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });
  
  // 獲取排序指示器
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? '↑' : '↓';
  };
  
  // 處理調整完成
  const handleAdjustComplete = () => {
    setAdjustItem(null);
    if (onItemUpdated) onItemUpdated();
  };
  
  // 檢查是否低庫存
  const isLowStock = (item) => {
    return item.min_quantity > 0 && item.current_quantity <= item.min_quantity;
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th 
                className="px-4 py-3 text-left text-sm font-medium text-gray-300 cursor-pointer"
                onClick={() => requestSort('product_id')}
              >
                產品編號 {getSortIndicator('product_id')}
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium text-gray-300 cursor-pointer"
                onClick={() => requestSort('product_name')}
              >
                名稱 {getSortIndicator('product_name')}
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium text-gray-300 cursor-pointer"
                onClick={() => requestSort('category')}
              >
                類別 {getSortIndicator('category')}
              </th>
              <th 
                className="px-4 py-3 text-right text-sm font-medium text-gray-300 cursor-pointer"
                onClick={() => requestSort('current_quantity')}
              >
                現有庫存 {getSortIndicator('current_quantity')}
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium text-gray-300"
              >
                單位
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium text-gray-300"
              >
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {sortedItems.map((item) => (
              <tr key={item.id} className={isLowStock(item) ? 'bg-red-900 bg-opacity-30' : ''}>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">
                  {item.product_id}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                  {item.product_name}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                  {item.category || '其他'}
                </td>
                <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-medium ${
                  isLowStock(item) ? 'text-red-400' : 'text-green-400'
                }`}>
                  {parseFloat(item.current_quantity).toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                  {item.unit}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300 space-x-2">
                  <Button
                    onClick={() => setAdjustItem(item)}
                    variant="secondary"
                    className="px-3 py-1 text-sm"
                  >
                    調整數量
                  </Button>
                  <Link to={`/inventory/${item.id}`}>
                    <Button
                      variant="secondary"
                      className="px-3 py-1 text-sm"
                    >
                      詳情
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
            {sortedItems.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                  沒有找到庫存項目
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* 調整數量彈窗 */}
      {adjustItem && (
        <QuantityAdjustModal 
          item={adjustItem} 
          onClose={() => setAdjustItem(null)}
          onComplete={handleAdjustComplete}
        />
      )}
    </div>
  );
};

export default InventoryTable;