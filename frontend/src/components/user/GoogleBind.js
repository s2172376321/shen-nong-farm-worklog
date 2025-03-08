// 位置：frontend/src/components/user/GoogleBind.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { bindGoogleAccount, unbindGoogleAccount } from '../../utils/api';
import { Button } from '../ui';

const GoogleBind = () => {
  const { user, updateUser } = useAuth();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [isConfirmingUnbind, setIsConfirmingUnbind] = useState(false);

  // 初始化 Google Identity Services
  const initializeGoogle = useCallback(() => {
    if (window.google && window.google.accounts && !scriptLoaded) {
      setScriptLoaded(true);
      console.log('Google Identity Services 初始化成功');
    }
  }, [scriptLoaded]);

  const handleGoogleBind = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setDebugInfo(null);

    try {
      console.log('開始Google帳號綁定流程');
      
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
            console.error('Google授權錯誤:', tokenResponse);
            setError(tokenResponse.error_description || '無法獲取 Google 帳號資訊');
            setIsLoading(false);
            return;
          }

          try {
            console.log('已獲取 Google 授權，正在獲取用戶資訊');
            
            // 使用 access token 獲取用戶資訊
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });

            if (!userInfoResponse.ok) {
              const errorText = await userInfoResponse.text();
              console.error('Google用戶資訊獲取失敗:', errorText);
              throw new Error(`無法獲取 Google 用戶資訊: ${userInfoResponse.status} ${errorText}`);
            }

            const profileData = await userInfoResponse.json();
            console.log('已獲取Google用戶資訊', {
              sub: profileData.sub,
              email: profileData.email,
              name: profileData.name
            });
            
            // 記錄綁定前的資訊
            setDebugInfo({
              googleId: profileData.sub,
              email: profileData.email,
              currentUserId: user?.id
            });
            
            // 呼叫綁定 API
            console.log('正在呼叫綁定API...');
            const bindResponse = await bindGoogleAccount(profileData.sub, profileData.email);
            
            console.log('綁定API響應成功:', bindResponse);
            
            // 更新用戶資訊
            updateUser(bindResponse.user);
            
            setSuccess('Google 帳號綁定成功');
          } catch (apiError) {
            console.error('API或綁定過程錯誤:', apiError);
            
            // 詳細記錄錯誤信息
            let errorMessage = 'Google 帳號綁定失敗';
            let errorDetails = null;
            
            if (apiError.response) {
              // 服務器回應了錯誤
              errorMessage = apiError.response.data?.message || errorMessage;
              console.error('服務器錯誤詳情:', {
                status: apiError.response.status,
                statusText: apiError.response.statusText,
                data: apiError.response.data
              });
              
              errorDetails = {
                status: apiError.response.status,
                statusText: apiError.response.statusText,
                url: apiError.response.config?.url
              };
            } else if (apiError.request) {
              // 請求發送了但沒有收到回應
              errorMessage = '伺服器無回應，請稍後再試';
              console.error('請求未收到回應:', apiError.request);
              
              errorDetails = {
                message: '請求未收到回應',
                requestUrl: apiError.config?.url
              };
            } else {
              // 設置請求時發生了錯誤
              errorMessage = apiError.message || errorMessage;
              console.error('請求設置錯誤:', apiError.message);
              
              errorDetails = {
                message: apiError.message
              };
            }
            
            setError(errorMessage);
            setDebugInfo(errorDetails);
          } finally {
            setIsLoading(false);
          }
        }
      });

      // 請求 access token
      console.log('請求Google授權...');
      tokenClient.requestAccessToken();
    } catch (error) {
      console.error('Google 帳號綁定處理失敗:', error);
      setError(error.message || 'Google 帳號綁定失敗，請稍後再試');
      setIsLoading(false);
    }
  };

  // 處理解除綁定
  const handleUnbindGoogle = async () => {
    if (isLoading) return;
    
    if (!isConfirmingUnbind) {
      setIsConfirmingUnbind(true);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await unbindGoogleAccount();
      
      // 更新用戶資訊，移除 Google 綁定相關資訊
      const updatedUser = {
        ...user,
        google_id: null,
        google_email: null
      };
      updateUser(updatedUser);
      
      setSuccess('Google 帳號已成功解除綁定');
      setIsConfirmingUnbind(false);
    } catch (error) {
      console.error('解除 Google 綁定失敗:', error);
      setError(error.response?.data?.message || '解除 Google 綁定失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  // 取消解除綁定確認
  const handleCancelUnbind = () => {
    setIsConfirmingUnbind(false);
  };

  // 載入 Google Identity Services SDK
  useEffect(() => {
    // 避免重複載入
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      console.log('Google腳本已存在，初始化中...');
      initializeGoogle();
      return;
    }

    console.log('正在載入Google Identity Services腳本...');
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google Identity Services 腳本加載成功');
      initializeGoogle();
    };
    script.onerror = (e) => {
      console.error('Google Identity Services 腳本載入失敗', e);
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
          <p className="font-semibold">{error}</p>
          {debugInfo && (
            <div className="mt-2 text-xs opacity-75">
              <p>錯誤詳情：</p>
              <pre className="overflow-x-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
      
      {success && (
        <div className="bg-green-600 text-white p-3 rounded-lg mb-4">
          {success}
        </div>
      )}
      
      {user.google_id ? (
        <>
          <div className="text-green-400 p-3 bg-gray-700 rounded-lg mb-4">
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
          
          {/* 解除綁定按鈕 */}
          {isConfirmingUnbind ? (
            <div className="space-y-3">
              <p className="text-yellow-400 text-sm mb-2">
                確定要解除 Google 帳號綁定嗎？此操作將會移除您與 Google 帳號的關聯。
              </p>
              <div className="flex space-x-3">
                <Button 
                  onClick={handleUnbindGoogle}
                  className="w-1/2 bg-red-600 hover:bg-red-700"
                  disabled={isLoading}
                >
                  {isLoading ? '處理中...' : '確認解除'}
                </Button>
                <Button 
                  onClick={handleCancelUnbind}
                  variant="secondary"
                  className="w-1/2"
                  disabled={isLoading}
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              onClick={() => setIsConfirmingUnbind(true)}
              variant="secondary"
              className="w-full flex items-center justify-center"
              disabled={isLoading}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="mr-2"
              >
                <path d="M18 6L6 18M6 6l12 12"></path>
              </svg>
              解除 Google 綁定
            </Button>
          )}
        </>
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
        {user.google_id 
          ? '已綁定 Google 帳號，您可以使用 Google 快速登入。解除綁定後，您需要使用用戶名和密碼登入。' 
          : '綁定 Google 帳號後，您可以使用 Google 登入功能快速訪問系統。'}
      </div>
    </div>
  );
};

export default GoogleBind;