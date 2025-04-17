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
    const response = await api.get('/inventory', {
      timeout: 10000 // 10秒超時
    });
    
    // 儲存到快取
    apiCache.set('inventoryItems', response.data, 60000); // 快取1分鐘
    
    return response.data;
  } catch (error) {
    console.error('獲取庫存項目失敗:', error);
    throw error;
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
  // 檢查快取
  const cacheKey = `inventoryItem:${itemId}`;
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    console.log(`使用快取的庫存項目 ${itemId} 詳情`);
    return cachedData;
  }
  
  try {
    const response = await api.get(`/inventory/${itemId}`, {
      timeout: 10000
    });
    
    // 儲存到快取
    apiCache.set(cacheKey, response.data, 60000); // 快取1分鐘
    
    return response.data;
  } catch (error) {
    console.error(`獲取庫存項目 ${itemId} 詳情失敗:`, error);
    throw error;
  }
};

// 創建新庫存項目
export const createInventoryItem = async (itemData) => {
  try {
    const response = await api.post('/inventory', itemData, {
      timeout: 10000
    });
    
    // 清除相關快取
    apiCache.clear('inventoryItems');
    apiCache.clear('lowStockItems');
    
    return response.data;
  } catch (error) {
    console.error('創建庫存項目失敗:', error);
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
  // 檢查快取
  const cacheKey = `inventoryTransactions:${JSON.stringify(filters)}`;
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    console.log('使用快取的庫存交易歷史');
    return cachedData;
  }
  
  try {
    const response = await api.get('/inventory/transactions', {
      params: filters,
      timeout: 10000
    });
    
    // 儲存到快取
    apiCache.set(cacheKey, response.data, 60000); // 快取1分鐘
    
    return response.data;
  } catch (error) {
    console.error('獲取庫存交易歷史失敗:', error);
    throw error;
  }
};

// 從工作日誌同步庫存消耗
export const syncFromWorkLog = async (workLogId) => {
  try {
    const response = await api.post(`/inventory/sync-from-worklog/${workLogId}`, {}, {
      timeout: 10000
    });
    
    // 清除相關快取
    apiCache.clear('inventoryItems');
    apiCache.clear('lowStockItems');
    
    return response.data;
  } catch (error) {
    console.error(`從工作日誌 ${workLogId} 同步庫存消耗失敗:`, error);
    throw error;
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
    const response = await api.get('/inventory/checkouts', { params: filters });
    return response.data;
  } catch (error) {
    console.error('獲取庫存領用記錄失敗:', error);
    throw error;
  }
};

// 根據產品ID查詢庫存項目
export const fetchInventoryItemByProductId = async (productId) => {
  try {
    const response = await api.get(`/inventory/product/${productId}`);
    return response.data;
  } catch (error) {
    console.error('獲取庫存項目失敗:', error);
    throw error;
  }
};