// 位置：frontend/src/components/auth/LoginPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { GoogleLoginButton } from './GoogleLogin';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  
  // 如果用戶已登入，重定向到首頁
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    
    // 驗證表單
    if (!username || !password) {
      setError('請填寫使用者名稱和密碼');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('嘗試使用帳號密碼登入...');
      await login(username, password);
      
      // 登入成功後，AuthContext 中的 redirectBasedOnRole 會處理跳轉
      // 不需要在這裡手動導航
    } catch (err) {
      console.error('登入失敗:', err);
      
      // 提供更友好的錯誤訊息
      if (err.response) {
        if (err.response.status === 401) {
          setError('帳號或密碼不正確');
        } else if (err.response.status === 403) {
          setError('您沒有權限登入系統');
        } else if (err.response.status >= 500) {
          setError('伺服器錯誤，請稍後再試');
        } else {
          setError(err.response.data?.message || '登入失敗，請檢查帳號密碼');
        }
      } else if (err.request) {
        setError('無法連接到伺服器，請檢查網路連接');
      } else {
        setError(err.message || '登入過程中發生未知錯誤');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">神農山莊</h2>
          <p className="text-gray-400">工作日誌系統</p>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Input 
              type="text" 
              placeholder="帳號" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div>
            <Input 
              type="password" 
              placeholder="密碼" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                登入中...
              </div>
            ) : '登入'}
          </Button>
        </form>

        <div className="my-4 flex items-center">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="mx-4 text-gray-400">或</span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>

        {/* 引入改進後的 Google 登入按鈕 */}
        <GoogleLoginButton />

        <div className="text-center mt-4">
          <a 
            href="/forgot-password" 
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            忘記密碼？
          </a>
        </div>
        
        {/* 添加環境信息，幫助調試 */}
        <div className="mt-8 text-xs text-gray-500 text-center">
          <p>
            環境: {process.env.NODE_ENV}
            {process.env.REACT_APP_API_URL && ` | API: ${process.env.REACT_APP_API_URL}`}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;