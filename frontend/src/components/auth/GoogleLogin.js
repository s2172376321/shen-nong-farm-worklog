// 位置：frontend/src/components/auth/GoogleLogin.js
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui';

export const GoogleLoginButton = () => {
  const { loginWithGoogle } = useAuth();
  const buttonRef = useRef(null);
  const googleInitialized = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showFallbackButton, setShowFallbackButton] = useState(false);

  // 使用 useCallback 包裝函數，以便可以安全地添加到依賴數組
  const initGoogleOneTap = useCallback(() => {
    if (window.google && window.google.accounts && !googleInitialized.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });
        googleInitialized.current = true;
        setScriptLoaded(true);
        console.log('Google Identity Services 初始化成功');
      } catch (err) {
        console.error('Google 初始化失敗:', err);
        setShowFallbackButton(true); // 顯示傳統按鈕
      }
    }
  }, []);

  // 處理 Google 憑證響應
  const handleCredentialResponse = async (response) => {
    if (response.credential) {
      setIsLoading(true);
      try {
        // ID token 直接傳給後端驗證
        await loginWithGoogle(response.credential);
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('登入處理失敗:', error);
        alert('登入處理失敗，請稍後再試');
        setIsLoading(false);
      }
    } else {
      console.warn('未獲得憑證');
      setShowFallbackButton(true);
    }
  };

  // 手動觸發 Google 登入
  const handleGoogleLogin = () => {
    if (isLoading) return; // 避免重複點擊

    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      console.error('Google Identity Services 尚未載入');
      alert('Google 登入服務未能載入，請稍後再試');
      return;
    }

    setIsLoading(true);

    // 使用 One Tap 流程
    window.google.accounts.id.prompt((notification) => {
      setIsLoading(false);
      
      if (notification.isNotDisplayed()) {
        console.log('One Tap 未顯示:', notification.getNotDisplayedReason());
        renderGoogleButton(); // 顯示傳統按鈕
      } else if (notification.isSkippedMoment()) {
        console.log('One Tap 被跳過:', notification.getSkippedReason());
        renderGoogleButton(); // 顯示傳統按鈕
      } else if (notification.isDismissedMoment()) {
        console.log('One Tap 被關閉:', notification.getDismissedReason());
        // 用戶主動關閉，不需處理
      }
    });
  };

  // 渲染傳統 Google 按鈕作為備用
  const renderGoogleButton = () => {
    if (!buttonRef.current || !window.google || !window.google.accounts || !window.google.accounts.id) {
      setShowFallbackButton(true);
      return;
    }

    // 清空容器
    while (buttonRef.current.firstChild) {
      buttonRef.current.removeChild(buttonRef.current.firstChild);
    }

    // 渲染 Google 按鈕
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: buttonRef.current.offsetWidth
    });
    
    setShowFallbackButton(true);
  };

  // 使用 OAuth 流程作為後備方案
  const handleOAuthLogin = useCallback(async () => {
    if (isLoading) return;
    
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      alert('Google 登入服務未能載入，請稍後再試');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        scope: 'email profile',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('OAuth 錯誤:', tokenResponse.error);
            alert('無法登入 Google 帳號，請稍後再試');
            setIsLoading(false);
            return;
          }
          
          try {
            await loginWithGoogle(tokenResponse.access_token);
            window.location.href = '/dashboard';
          } catch (error) {
            console.error('登入處理失敗:', error);
            alert('登入處理失敗，請稍後再試');
            setIsLoading(false);
          }
        }
      });
      
      client.requestAccessToken();
    } catch (error) {
      console.error('OAuth 初始化失敗:', error);
      alert('無法初始化登入流程，請稍後再試');
      setIsLoading(false);
    }
  }, [isLoading, loginWithGoogle]);

  // 載入 Google Identity Services SDK
  useEffect(() => {
    const loadGoogleScript = () => {
      // 檢查是否已載入
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        console.log('Google Identity Services 腳本已存在');
        initGoogleOneTap();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.id = 'google-gsi-script';
      
      script.onload = () => {
        console.log('Google Identity Services 已載入');
        initGoogleOneTap();
      };
      
      script.onerror = (e) => {
        console.error('Google Identity Services 載入失敗', e);
        setShowFallbackButton(true);
      };
      
      document.body.appendChild(script);
    };

    loadGoogleScript();
    
    // 清理函數
    return () => {
      // 如果組件卸載，清理任何Google登入的狀態
      if (window.google && window.google.accounts) {
        try {
          // 取消任何進行中的提示
          window.google.accounts.id.cancel();
          console.log('已清理 Google Identity Services 狀態');
        } catch (err) {
          console.error('清理 Google Identity Services 失敗:', err);
        }
      }
    };
  }, [initGoogleOneTap]);

  return (
    <div className="w-full">
      {/* 主要登入按鈕 */}
      <Button 
        onClick={scriptLoaded ? handleGoogleLogin : handleOAuthLogin}
        variant="outline"
        className="w-full flex items-center justify-center mb-2"
        disabled={isLoading}
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
              <path 
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" 
                fill="#4285F4"
              />
              <path 
                d="M12 23c2.97 0 5.46-1 7.28-2.72l-3.57-2.77c-.99.69-2.26 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" 
                fill="#34A853"
              />
              <path 
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.66-2.07z" 
                fill="#FBBC05"
              />
              <path 
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" 
                fill="#EA4335"
              />
            </svg>
            使用 Google 帳號登入
          </>
        )}
      </Button>
      
      {/* 備用Google按鈕容器 */}
      {showFallbackButton && (
        <div 
          ref={buttonRef} 
          className="w-full mt-2 min-h-[40px] flex justify-center"
          id="google-custom-button"
        />
      )}
    </div>
  );
};

export default GoogleLoginButton;