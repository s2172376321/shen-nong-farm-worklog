// 位置：frontend/src/utils/inventoryApi.js
import api, { apiCache } from './api';

// 獲取所有庫存項目
export const fetchInventory = async () => {
  try {
    console.log('開始獲取庫存數據');
    const response = await api.get('/inventory', {
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    console.log('獲取到的庫存數據:', response.data);
    
    if (!Array.isArray(response.data)) {
      console.error('返回的數據不是數組:', response.data);
      return [];
    }
    
    return response.data;
  } catch (error) {
    console.error('獲取庫存失敗:', error);
    throw error;
  }
};

// 為了向後兼容，添加別名
export const fetchInventoryItems = fetchInventory;

// 獲取低庫存警告
export const fetchLowStockItems = async () => {
  try {
    console.log('開始獲取低庫存警報');
    const response = await api.get('/inventory/alerts/low-stock', {
      timeout: 8000
    });
    
    console.log('獲取低庫存警報成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('獲取低庫存警報失敗:', error);
    throw error;
  }
};

// 獲取單一庫存項目詳情
export const fetchInventoryItemDetails = async (itemId) => {
  try {
    const response = await api.get(`/inventory/${itemId}`, {
      timeout: 5000 // 5秒超時
    });
    
    return response.data;
  } catch (error) {
    console.error('獲取庫存項目詳情失敗:', error);
    
    // 檢查是否為超時錯誤
    if (error.code === 'ECONNABORTED') {
      throw new Error('請求超時，請檢查網路連接');
    }
    
    // 檢查是否為 404 錯誤
    if (error.response?.status === 404) {
      throw new Error('找不到該庫存項目');
    }
    
    // 其他錯誤
    throw new Error(
      error.response?.data?.message || 
      '獲取庫存項目詳情失敗，請稍後再試'
    );
  }
};

// 新增庫存項目
export const createInventoryItem = async (itemData) => {
  if (!itemData || !itemData.product_name) {
    throw new Error('請提供完整的庫存項目資料');
  }

  try {
    const response = await api.post('/inventory', itemData, {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('新增庫存項目失敗:', error);
    throw error;
  }
};

// 更新庫存項目
export const updateInventoryItem = async (itemId, itemData) => {
  try {
    const response = await api.put(`/inventory/${itemId}`, itemData, {
      timeout: 10000
    });
    
    // 清除相關快取
    apiCache.clear('inventoryItems');
    apiCache.clear('lowStockItems');
    apiCache.clear(`inventoryItem:${itemId}`);
    
    return response.data;
  } catch (error) {
    console.error(`更新庫存項目 ${itemId} 失敗:`, error);
    throw error;
  }
};

// 調整庫存數量
export const adjustInventoryQuantity = async (itemId, adjustmentData) => {
  try {
    console.log(`調整庫存項目 ${itemId} 的數量:`, adjustmentData);
    const response = await api.patch(`/inventory/${itemId}/quantity`, adjustmentData, {
      timeout: 10000
    });
    
    console.log('庫存調整成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('調整庫存失敗:', error);
    throw error;
  }
};

// 獲取庫存交易記錄
export const fetchInventoryTransactions = async (filters = {}) => {
  try {
    const response = await api.get('/inventory/transactions', {
      params: filters,
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('獲取庫存交易記錄失敗:', error);
    throw error;
  }
};

// 同步產品到庫存
export const syncInventoryFromProducts = async () => {
  try {
    console.log('開始同步產品到庫存');
    const response = await api.post('/inventory/sync-from-products', {}, {
      timeout: 15000
    });
    
    console.log('同步成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('同步庫存失敗:', error);
    throw error;
  }
};

// 庫存出庫
export const checkoutInventory = async (checkoutData) => {
  try {
    const response = await api.post('/inventory/checkout', checkoutData);
    return response.data;
  } catch (error) {
    console.error('庫存出庫失敗:', error);
    throw error;
  }
};

// 創建庫存出庫記錄
export const createInventoryCheckout = async (checkoutData) => {
  try {
    console.log('創建庫存出庫記錄:', checkoutData);
    
    if (!checkoutData || !checkoutData.items || !Array.isArray(checkoutData.items)) {
      throw new Error('無效的出庫數據格式');
    }

    const response = await api.post('/inventory/checkout', checkoutData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 清除相關快取
    apiCache.clear('inventoryItems');
    apiCache.clear('lowStockItems');
    apiCache.clear('checkouts');

    console.log('出庫記錄創建成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('創建出庫記錄失敗:', {
      error: error.message,
      data: error.response?.data,
      status: error.response?.status
    });

    // 根據錯誤類型返回適當的錯誤訊息
    if (error.response) {
      switch (error.response.status) {
        case 400:
          throw new Error(error.response.data?.message || '出庫數據格式錯誤');
        case 404:
          throw new Error('找不到指定的庫存項目');
        case 409:
          throw new Error('庫存數量不足');
        default:
          throw new Error('創建出庫記錄失敗，請稍後再試');
      }
    }

    throw new Error('無法連接到伺服器，請檢查網路連接');
  }
};

// 獲取出庫記錄
export const fetchCheckouts = async (filters = {}) => {
  try {
    const response = await api.get('/inventory/checkouts', {
      params: filters,
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('獲取出庫記錄失敗:', error);
    throw error;
  }
};

// 根據產品ID查詢庫存項目
export const fetchInventoryItemByProductId = async (productId) => {
  if (!productId) {
    throw new Error('請提供產品ID');
  }

  try {
    const response = await api.get(`/inventory/product/${productId}`, {
      timeout: 15000,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      }
    });
    
    if (!response.data) {
      throw new Error('找不到指定的庫存項目');
    }
    
    return response.data;
  } catch (error) {
    console.error('獲取庫存項目失敗:', {
      productId,
      error: error.message,
      status: error.response?.status,
      response: error.response?.data,
      timestamp: new Date().toISOString()
    });
    throw new Error(error.response?.data?.message || '獲取庫存項目失敗，請稍後再試');
  }
};

// 匯入 CSV 文件
export const importInventoryCSV = async (file) => {
  try {
    console.log('開始上傳 CSV 文件:', file.name);
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/inventory/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000
    });

    console.log('CSV 上傳成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('上傳 CSV 失敗:', error);
    throw error;
  }
};

// 批量更新庫存項目
export const batchUpdateInventory = async (items) => {
  try {
    console.log('開始批量更新庫存:', items);
    
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('無效的批量更新數據');
    }

    const response = await api.post('/inventory/batch-update', { items }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 清除相關快取
    apiCache.clear('inventoryItems');
    apiCache.clear('lowStockItems');
    
    console.log('批量更新成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('批量更新失敗:', {
      error: error.message,
      data: error.response?.data,
      status: error.response?.status
    });

    if (error.response) {
      switch (error.response.status) {
        case 400:
          throw new Error(error.response.data?.message || '更新數據格式錯誤');
        case 404:
          throw new Error('找不到指定的庫存項目');
        case 409:
          throw new Error('庫存數量衝突');
        default:
          throw new Error('批量更新失敗，請稍後再試');
      }
    }

    throw new Error('無法連接到伺服器，請檢查網路連接');
  }
};