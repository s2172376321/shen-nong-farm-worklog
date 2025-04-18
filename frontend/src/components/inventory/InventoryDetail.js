// 位置：frontend/src/components/inventory/InventoryDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchInventoryItemDetails } from '../../utils/inventoryApi';
import { Button, Card } from '../ui';
import QuantityAdjustModal from './QuantityAdjustModal';
import { useAuth } from '../../context/AuthContext';

const InventoryDetail = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [qrVisible, setQrVisible] = useState(true);
  
  // 加載項目詳情
  useEffect(() => {
    const loadDetails = async () => {
      // UUID 格式驗證
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!itemId || !uuidRegex.test(itemId)) {
        setError('無效的庫存項目ID格式');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetchInventoryItemDetails(itemId);
        
        if (!response || !response.success) {
          throw new Error(response?.message || '找不到該庫存項目');
        }
        
        if (!response.item) {
          throw new Error('無效的數據格式');
        }
        
        setItem(response.item);
        setTransactions(response.transactions || []);
      } catch (err) {
        console.error('載入庫存項目詳情失敗:', err);
        setError(err.message || '載入庫存項目詳情失敗，請稍後再試');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDetails();
  }, [itemId]);
  
  // 返回函數
  const handleGoBack = () => {
    navigate('/inventory');
  };

  // 處理調整完成
  const handleAdjustComplete = async () => {
    setShowAdjustModal(false);
    try {
      setIsLoading(true);
      const data = await fetchInventoryItemDetails(itemId);
      setItem(data.item);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('重新載入庫存項目詳情失敗:', err);
      setError('重新載入庫存項目詳情失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 格式化日期時間
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  // 獲取交易類型中文名稱
  const getTransactionTypeText = (type) => {
    const typeMap = {
      'in': '進貨',
      'out': '出庫',
      'adjust': '直接調整'
    };
    return typeMap[type] || type;
  };

  // 獲取交易類型顏色類別
  const getTransactionTypeColorClass = (type) => {
    const colorMap = {
      'in': 'text-green-400',
      'out': 'text-red-400',
      'adjust': 'text-yellow-400'
    };
    return colorMap[type] || '';
  };

  // 列印 QR 碼
  const handlePrintQR = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    
    if (!printWindow) {
      alert('請允許彈出視窗以列印 QR 碼');
      return;
    }
    
    const qrCodeImg = document.getElementById('qr-code-img');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>庫存項目 QR 碼 - ${item.product_name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
          }
          .container {
            margin: 20px auto;
            max-width: 400px;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          .info {
            margin-top: 20px;
            text-align: left;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          table, th, td {
            border: 1px solid #ddd;
          }
          th, td {
            padding: 8px;
            text-align: left;
          }
          @media print {
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>庫存項目 QR 碼</h1>
          <div>
            <img src="${qrCodeImg.src}" alt="QR 碼" />
          </div>
          <div class="info">
            <table>
              <tr>
                <th>產品編號</th>
                <td>${item.product_id}</td>
              </tr>
              <tr>
                <th>產品名稱</th>
                <td>${item.product_name}</td>
              </tr>
              <tr>
                <th>類別</th>
                <td>${item.category || '其他'}</td>
              </tr>
              <tr>
                <th>單位</th>
                <td>${item.unit}</td>
              </tr>
            </table>
          </div>
          <div class="no-print" style="margin-top: 20px;">
            <button onclick="window.print()">列印</button>
            <button onclick="window.close()">關閉</button>
          </div>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-6xl mx-auto">
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
              返回庫存列表
            </Button>
          </div>
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-400">載入中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-6xl mx-auto">
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
              返回庫存列表
            </Button>
          </div>
          <div className="bg-red-600/20 border border-red-600 text-white p-4 rounded-lg">
            <p className="text-center">{error}</p>
            <div className="flex justify-center mt-4">
              <Button 
                onClick={handleGoBack}
                variant="secondary"
              >
                返回庫存列表
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-yellow-600 text-white p-4 rounded-lg">
            <p>找不到該庫存項目</p>
            <Button 
              onClick={handleGoBack}
              className="mt-4"
            >
              返回庫存列表
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
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
            返回庫存列表
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 左側：基本資訊和QR碼 */}
          <div className="md:col-span-1">
            <Card className="p-6">
              <h1 className="text-xl font-bold mb-4">{item.product_name}</h1>
              
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">產品編號</p>
                  <p className="font-medium">{item.product_id}</p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm">類別</p>
                  <p>{item.category || '其他'}</p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm">單位</p>
                  <p>{item.unit}</p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm">現有庫存</p>
                  <p className="text-xl font-bold text-green-400">
                    {parseFloat(item.current_quantity).toFixed(2)} {item.unit}
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm">最低庫存</p>
                  <p className={
                    parseFloat(item.current_quantity) <= parseFloat(item.min_quantity) && parseFloat(item.min_quantity) > 0
                      ? 'text-red-400'
                      : ''
                  }>
                    {parseFloat(item.min_quantity).toFixed(2)} {item.unit}
                  </p>
                </div>
                
                {item.description && (
                  <div>
                    <p className="text-gray-400 text-sm">描述</p>
                    <p className="whitespace-pre-wrap">{item.description}</p>
                  </div>
                )}
                
                <div className="pt-4 space-y-2">
                  <Button
                    onClick={() => setShowAdjustModal(true)}
                    className="w-full"
                  >
                    調整庫存
                  </Button>
                  
                  {user.role === 'admin' && (
                    <Button
                      onClick={() => navigate(`/inventory/edit/${item.id}`)}
                      variant="secondary"
                      className="w-full"
                    >
                      編輯項目
                    </Button>
                  )}
                </div>
              </div>
            </Card>
            
            {/* QR 碼 */}
            {item.qr_code_url && (
              <Card className="p-6 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">QR 碼</h2>
                  <Button
                    variant="secondary"
                    className="py-1 px-2 text-sm"
                    onClick={() => setQrVisible(!qrVisible)}
                  >
                    {qrVisible ? '隱藏' : '顯示'}
                  </Button>
                </div>
                
                {qrVisible && (
                  <div className="flex flex-col items-center">
                    <div className="mb-4 p-2 bg-white rounded-lg">
                      <img
                        id="qr-code-img"
                        src={item.qr_code_url.startsWith('http') ? item.qr_code_url : `${process.env.REACT_APP_API_URL?.replace('/api', '')}${item.qr_code_url}`}
                        alt="庫存項目 QR 碼"
                        className="w-full max-w-xs"
                      />
                    </div>
                    <Button
                      onClick={handlePrintQR}
                      variant="secondary"
                      className="w-full"
                    >
                      列印 QR 碼
                    </Button>
                  </div>
                )}
              </Card>
            )}
          </div>
          
          {/* 右側：交易歷史 */}
          <div className="md:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">交易歷史</h2>
              
              {transactions.length === 0 ? (
                <p className="text-center text-gray-400 py-4">
                  暫無交易記錄
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3">時間</th>
                        <th className="px-4 py-3">類型</th>
                        <th className="px-4 py-3 text-right">數量</th>
                        <th className="px-4 py-3">操作人</th>
                        <th className="px-4 py-3">領用人</th>
                        <th className="px-4 py-3">用途</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {transactions.map((transaction, index) => (
                        <tr key={index} className="hover:bg-gray-800">
                          <td className="px-4 py-3 text-sm">
                            {formatDateTime(transaction.created_at)}
                          </td>
                          <td className={`px-4 py-3 text-sm ${getTransactionTypeColorClass(transaction.transaction_type)}`}>
                            {getTransactionTypeText(transaction.transaction_type)}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${getTransactionTypeColorClass(transaction.transaction_type)}`}>
                            {transaction.transaction_type === 'out' ? '-' : '+'}{parseFloat(transaction.quantity).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {transaction.username || '系統'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {transaction.requester_name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {transaction.purpose || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
      
      {/* 調整數量彈窗 */}
      {showAdjustModal && (
        <QuantityAdjustModal 
          item={item} 
          onClose={() => setShowAdjustModal(false)}
          onComplete={handleAdjustComplete}
        />
      )}
    </div>
  );
};

export default InventoryDetail;