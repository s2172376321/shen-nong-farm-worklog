// 位置：frontend/src/utils/inventoryApi.js
import api, { apiCache } from './api';

// 獲取所有庫存項目
export const fetchInventoryItems = async () => {
  // 檢查快取
  const cachedData = apiCache.get('inventoryItems');
  if (cachedData) {
    console.log('使用快取的庫存項目數據');
    return cachedData;
  }
  
  try {
    const response = await api.get('/inventory/', {
      timeout: 15000, // 增加超時時間到15秒
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      validateStatus: function (status) {
        return status >= 200 && status < 300; // 只接受2xx的響應
      }
    });
    
    if (!response.data) {
      throw new Error('伺服器返回空數據');
    }
    
    // 儲存到快取
    apiCache.set('inventoryItems', response.data, 60000); // 快取1分鐘
    
    return response.data;
  } catch (error) {
    console.error('獲取庫存項目失敗:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      timestamp: new Date().toISOString()
    });
    throw new Error(error.response?.data?.message || '獲取庫存項目失敗，請稍後再試');
  }
};

// 獲取低庫存項目
export const fetchLowStockItems = async () => {
  // 檢查快取
  const cachedData = apiCache.get('lowStockItems');
  if (cachedData) {
    console.log('使用快取的低庫存項目數據');
    return cachedData;
  }
  
  try {
    const response = await api.get('/inventory/low-stock', {
      timeout: 10000
    });
    
    // 儲存到快取
    apiCache.set('lowStockItems', response.data, 60000); // 快取1分鐘
    
    return response.data;
  } catch (error) {
    console.error('獲取低庫存項目失敗:', error);
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

// 創建新庫存項目
export const createInventoryItem = async (itemData) => {
  if (!itemData || !itemData.product_name) {
    throw new Error('請提供完整的庫存項目資料');
  }

  try {
    const response = await api.post('/inventory', itemData, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      }
    });
    
    // 清除相關快取
    apiCache.clear('inventoryItems');
    apiCache.clear('lowStockItems');
    
    return response.data;
  } catch (error) {
    console.error('創建庫存項目失敗:', {
      data: itemData,
      error: error.message,
      status: error.response?.status,
      response: error.response?.data,
      timestamp: new Date().toISOString()
    });
    throw new Error(error.response?.data?.message || '創建庫存項目失敗，請稍後再試');
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
    const response = await api.post(`/inventory/${itemId}/adjust`, adjustmentData, {
      timeout: 10000
    });
    
    // 清除相關快取
    apiCache.clear('inventoryItems');
    apiCache.clear('lowStockItems');
    apiCache.clear(`inventoryItem:${itemId}`);
    
    return response.data;
  } catch (error) {
    console.error(`調整庫存項目 ${itemId} 數量失敗:`, error);
    throw error;
  }
};

// 獲取庫存交易歷史
export const fetchInventoryTransactions = async (filters = {}) => {
  const cacheKey = `inventoryTransactions:${JSON.stringify(filters)}`;
  const cachedData = apiCache.get(cacheKey);
  
  if (cachedData) {
    console.log('使用快取的庫存交易歷史');
    return cachedData;
  }
  
  try {
    const response = await api.get('/inventory/transactions', {
      params: filters,
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
      throw new Error('伺服器返回空數據');
    }
    
    // 儲存到快取
    apiCache.set(cacheKey, response.data, 60000);
    
    return response.data;
  } catch (error) {
    console.error('獲取庫存交易歷史失敗:', {
      filters,
      error: error.message,
      status: error.response?.status,
      response: error.response?.data,
      timestamp: new Date().toISOString()
    });
    throw new Error(error.response?.data?.message || '獲取庫存交易歷史失敗，請稍後再試');
  }
};

// 從工作日誌同步庫存消耗
export const syncFromWorkLog = async (workLogId) => {
  if (!workLogId) {
    throw new Error('請提供工作日誌ID');
  }

  try {
    const response = await api.post(`/inventory/sync-from-worklog/${workLogId}`, {}, {
      timeout: 30000, // 增加超時時間到30秒，因為同步可能需要更長時間
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      }
    });
    
    // 清除相關快取
    apiCache.clear('inventoryItems');
    apiCache.clear('lowStockItems');
    
    return response.data;
  } catch (error) {
    console.error(`從工作日誌同步庫存消耗失敗:`, {
      workLogId,
      error: error.message,
      status: error.response?.status,
      response: error.response?.data,
      timestamp: new Date().toISOString()
    });
    throw new Error(error.response?.data?.message || '同步庫存消耗失敗，請稍後再試');
  }
};

// 批量更新从產品列表
export const syncFromProductList = async () => {
  try {
    const response = await api.post('/inventory/sync-from-products', {}, {
      timeout: 30000 // 增加超時時間，因為這可能是個耗時操作
    });
    
    // 清除相關快取
    apiCache.clear('inventoryItems');
    apiCache.clear('lowStockItems');
    
    return response.data;
  } catch (error) {
    console.error('批量更新庫存項目失敗:', error);
    throw error;
  }
};

// 創建庫存領用記錄
export const createInventoryCheckout = async (checkoutData) => {
  try {
    const response = await api.post('/inventory/checkout', checkoutData);
    return response.data;
  } catch (error) {
    console.error('創建庫存領用記錄失敗:', error);
    throw error;
  }
};

// 獲取庫存領用記錄列表
export const fetchInventoryCheckouts = async (filters = {}) => {
  try {
    const response = await api.get('/inventory/checkouts', {
      params: filters,
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
      throw new Error('伺服器返回空數據');
    }
    
    return response.data;
  } catch (error) {
    console.error('獲取庫存領用記錄失敗:', {
      filters,
      error: error.message,
      status: error.response?.status,
      response: error.response?.data,
      timestamp: new Date().toISOString()
    });
    throw new Error(error.response?.data?.message || '獲取庫存領用記錄失敗，請稍後再試');
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