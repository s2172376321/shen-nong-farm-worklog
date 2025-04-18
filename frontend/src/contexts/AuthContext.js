const login = async (username, password) => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('開始登入流程:', {
      username,
      hasPassword: !!password,
      timestamp: new Date().toISOString()
    });

    const data = await loginUser(username, password);
    
    if (data.token) {
      // 驗證 token 格式
      if (!data.token.match(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)) {
        throw new Error('無效的認證令牌格式');
      }
      
      // 儲存 token 和用戶資料
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // 更新狀態
      setUser(data.user);
      setToken(data.token);
      
      console.log('登入成功，用戶資料已更新:', {
        userId: data.user.id,
        role: data.user.role,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } else {
      throw new Error('登入失敗：未收到認證令牌');
    }
  } catch (error) {
    // 詳細記錄錯誤
    console.error('登入過程發生錯誤:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      timestamp: new Date().toISOString()
    });
    
    // 設置錯誤訊息
    setError(error.message || '登入失敗，請稍後再試');
    return false;
  } finally {
    setLoading(false);
  }
}; 