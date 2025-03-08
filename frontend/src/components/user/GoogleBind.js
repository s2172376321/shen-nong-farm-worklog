// 位置：frontend/src/components/user/GoogleBind.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { bindGoogleAccount } from '../../utils/api';
import { Button } from '../ui';

const GoogleBind = () => {
  const { user, updateUser } = useAuth();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // 初始化 Google Identity Services
  const initializeGoogle = useCallback(() => {
    if (window.google && window.google.accounts && !scriptLoaded) {
      setScriptLoaded(true);
      console.log('Google Identity Services 已載入用於綁定');
    }
  }, [scriptLoaded]);

  const handleGoogleBind = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 檢查 Google Identity Services 是否已載入
      if (!window.google || !window.google.accounts) {
        throw new Error('Google 服務未載入，請刷新頁面後再試');
      }

      // 使用 Google Identity Services API 獲取憑證
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        scope: 'email profile',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setError(tokenResponse.error_description || '無法獲取 Google 帳號資訊');
            setIsLoading(false);
            return;
          }

          try {
            // 使用 access token 獲取用戶資訊
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });

            if (!response.ok) {
              throw new Error('無法獲取 Google 用戶資訊');
            }

            const profileData = await response.json();
            
            // 呼叫綁定 API
            const bindResponse = await bindGoogleAccount(profileData.sub, profileData.email);
            
            // 更新用戶資訊
            updateUser(bindResponse.user);
            
            setSuccess('Google 帳號綁定成功');
          } catch (apiError) {
            console.error('API 或綁定過程錯誤:', apiError);
            setError(apiError.response?.data?.message || 'Google 帳號綁定失敗');
          } finally {
            setIsLoading(false);
          }
        }
      });

      // 請求 access token
      tokenClient.requestAccessToken();
    } catch (error) {
      console.error('Google 帳號綁定處理失敗:', error);
      setError(error.message || 'Google 帳號綁定失敗，請稍後再試');
      setIsLoading(false);
    }
  };

  // 載入 Google Identity Services SDK
  useEffect(() => {
    // 避免重複載入
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      initializeGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google Identity Services 已載入');
      initializeGoogle();
    };
    script.onerror = () => {
      console.error('Google Identity Services 載入失敗');
      setError('無法載入 Google 服務，請檢查網絡連接');
    };
    document.body.appendChild(script);

    // 清理函數
    return () => {
      // 避免移除其他組件可能正在使用的腳本
    };
  }, [initializeGoogle]);

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Google 帳號綁定</h2>
      
      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-600 text-white p-3 rounded-lg mb-4">
          {success}
        </div>
      )}
      
      {user.google_id ? (
        <div className="text-green-400 p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center mb-2">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24"
              className="mr-2"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-1 7.28-2.72l-3.57-2.77c-.99.69-2.26 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.66-2.07z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="font-semibold">已綁定 Google 帳號</span>
          </div>
          {user.google_email && (
            <div className="text-sm text-gray-300 ml-7">
              {user.google_email}
            </div>
          )}
        </div>
      ) : (
        <Button 
          onClick={handleGoogleBind}
          variant="outline"
          className="w-full flex items-center justify-center"
          disabled={isLoading || !scriptLoaded}
        >
          {isLoading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              處理中...
            </div>
          ) : (
            <>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24"
                className="mr-2"
              >
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-1 7.28-2.72l-3.57-2.77c-.99.69-2.26 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.66-2.07z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              綁定 Google 帳號
            </>
          )}
        </Button>
      )}
      
      <div className="mt-4 text-sm text-gray-400">
        綁定 Google 帳號後，您可以使用 Google 登入功能快速訪問系統。
      </div>
    </div>
  );
};

export default GoogleBind;