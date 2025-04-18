const loadAllWorkLogs = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // 初始加載第一頁
    const initialFilters = {
      startDate: selectedDate,
      endDate: selectedDate,
      status: selectedStatus,
      page: 1,
      limit: 20
    };
    
    const initialData = await searchWorkLogs(initialFilters);
    setWorkLogs(initialData.data);
    setPagination(initialData.pagination);
    
    // 如果總頁數大於1，在背景加載剩餘頁面
    if (initialData.pagination.totalPages > 1) {
      const remainingPages = Array.from(
        { length: initialData.pagination.totalPages - 1 },
        (_, i) => i + 2
      );
      
      // 使用 Promise.all 並行加載剩餘頁面
      const remainingPromises = remainingPages.map(page => 
        searchWorkLogs({
          ...initialFilters,
          page
        })
      );
      
      // 在背景加載剩餘頁面
      Promise.all(remainingPromises)
        .then(results => {
          const allWorkLogs = [
            ...initialData.data,
            ...results.flatMap(result => result.data)
          ];
          setWorkLogs(allWorkLogs);
        })
        .catch(error => {
          console.error('背景加載工作日誌失敗:', error);
          // 不影響用戶當前操作，只記錄錯誤
        });
    }
  } catch (error) {
    console.error('加載工作日誌失敗:', error);
    setError('加載工作日誌失敗，請稍後重試');
  } finally {
    setLoading(false);
  }
}; 