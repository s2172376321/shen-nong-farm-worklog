// frontend/src/components/auth/GoogleLogin.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui';

export const GoogleLoginButton = () => {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  
  // 新增專門的調試函數
  const logDebug = (message, data = {}) => {
    const info = {
      timestamp: new Date().toISOString(),
      message,
      ...data
    };
    console.log(`[GoogleLogin Debug] ${message}`, data);
    setDebugInfo(prev => [...(prev || []), info]);
  };
  
  // 載入 Google API 腳本
  useEffect(() => {
    logDebug('組件掛載，準備載入 Google API');
    
    // 避免重複載入
    if (document.getElementById('google-api-script')) {
      logDebug('已發現 Google API 腳本存在');
      setScriptLoaded(true);
      return;
    }
    
    try {
      logDebug('開始載入 Google API 腳本');
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.id = 'google-api-script';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        logDebug('Google API 腳本載入成功');
        setScriptLoaded(true);
        initializeGoogleSignIn();
      };
      
      script.onerror = (e) => {
        const errorMsg = '無法載入 Google 登入服務，請檢查網路連接';
        logDebug('Google API 腳本載入失敗', { error: e });
        setError(errorMsg);
      };
      
      document.body.appendChild(script);
      logDebug('Google API 腳本已添加到 DOM');
    } catch (err) {
      logDebug('添加腳本時發生異常', { error: err.message });
      setError('設置 Google 登入時發生錯誤: ' + err.message);
    }
    
    return () => {
      logDebug('組件卸載');
      // 不要移除腳本，其他組件可能需要使用
    };
  }, []);
  
  // 初始化 Google 登入
  const initializeGoogleSignIn = () => {
    logDebug('嘗試初始化 Google 登入');
    
    if (!window.google || !window.google.accounts) {
      logDebug('Google API 不可用', { 
        windowGoogle: !!window.google, 
        googleAccounts: !!(window.google && window.google.accounts) 
      });
      setError('Google API 未成功載入，請重新整理頁面');
      return;
    }
    
    try {
      // 獲取 Google Client ID
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      logDebug('使用 Client ID', { clientId: clientId ? '設置了' : '缺失' });
      
      if (!clientId) {
        logDebug('缺少 Client ID 環境變數');
        setError('Google 客戶端 ID 未設置，請檢查環境配置');
        return;
      }
      
      // 初始化 Google Identity Services
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      
      // 確認按鈕容器存在
      const buttonContainer = document.getElementById('google-signin-button');
      if (!buttonContainer) {
        logDebug('找不到 Google 按鈕容器');
      } else {
        logDebug('渲染 Google 按鈕');
        // 渲染按鈕
        window.google.accounts.id.renderButton(
          buttonContainer,
          { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
        );
      }
      
      logDebug('Google 登入已初始化');
    } catch (error) {
      logDebug('初始化 Google 登入失敗', { error: error.message, stack: error.stack });
      setError('Google 登入服務初始化失敗: ' + error.message);
    }
  };
  
  // 處理 Google 回調
  const handleGoogleResponse = async (response) => {
    logDebug('收到 Google 回應', { 
      hasCredential: !!response?.credential,
      credentialLength: response?.credential?.length
    });
    
    if (!response || !response.credential) {
      logDebug('Google 回應缺少憑證', { response });
      setError('登入失敗：未收到有效的 Google 憑證');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      logDebug('準備調用 loginWithGoogle');
      
      // 直接使用瀏覽器內建的 fetch API 進行測試
      // 這可以繞過 axios 可能的問題
      try {
        logDebug('使用 fetch 直接測試 API');
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';
        const directResponse = await fetch(`${apiUrl}/auth/google-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token: response.credential })
        });
        
        const directResult = await directResponse.json();
        logDebug('直接 fetch 測試結果', { 
          status: directResponse.status,
          ok: directResponse.ok,
          hasToken: !!directResult.token
        });
      } catch (fetchError) {
        logDebug('直接 fetch 測試失敗', { error: fetchError.message });
      }
      
      // 使用 Context 函數進行實際登入
      const user = await loginWithGoogle(response.credential);
      logDebug('Google 登入成功', { user: user ? '獲得了用戶資料' : '沒有用戶資料' });
      
      // 成功登入後，頁面會自動跳轉
      // 但以防萬一，我們添加額外的重定向邏輯
      if (user && user.role) {
        logDebug('準備根據角色重定向', { role: user.role });
        
        // 延遲 1 秒後檢查是否已跳轉
        setTimeout(() => {
          const currentPath = window.location.pathname;
          if (currentPath === '/login') {
            logDebug('檢測到未跳轉，手動執行跳轉', { role: user.role });
            if (user.role === 'admin') {
              window.location.href = '/admin';
            } else {
              window.location.href = '/dashboard';
            }
          }
        }, 1000);
      }
    } catch (error) {
      logDebug('Google 登入處理失敗', { 
        message: error.message, 
        response: error.response?.data,
        status: error.response?.status 
      });
      setError(error.message || '登入處理過程中發生錯誤');
      setIsLoading(false);
    }
  };
  
  // 啟動 Google 登入流程
  const handleGoogleLoginClick = () => {
    if (isLoading) return;
    
    logDebug('點擊 Google 登入按鈕');
    setError(null);
    setIsLoading(true);
    
    if (!window.google || !window.google.accounts) {
      logDebug('點擊時 Google API 不可用，嘗試重新載入');
      setScriptLoaded(false);
      setIsLoading(false);
      setError('Google 登入服務不可用，請重新整理頁面');
      return;
    }
    
    try {
      // 觸發 Google 登入提示
      logDebug('觸發 Google 登入提示');
      window.google.accounts.id.prompt((notification) => {
        logDebug('收到 Google prompt 通知', { 
          notDisplayed: notification.isNotDisplayed(),
          skipped: notification.isSkippedMoment(),
          reason: notification.getNotDisplayedReason() || notification.getSkippedReason()
        });
        
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // 備用方案：使用自定義按鈕觸發 One Tap
          const googleDiv = document.getElementById('google-signin-button');
          if (googleDiv) {
            logDebug('使用備用 Google 按鈕');
            googleDiv.innerHTML = '';
            window.google.accounts.id.renderButton(googleDiv, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: 'signin_with'
            });
          }
        }
        
        // 完成提示過程，不再顯示讀取狀態
        setIsLoading(false);
      });
    } catch (error) {
      logDebug('觸發 Google 登入提示失敗', { error: error.message });
      setError('無法啟動 Google 登入流程');
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        onClick={handleGoogleLoginClick}
        variant="outline"
        className="w-full flex items-center justify-center mb-2"
        disabled={isLoading || !scriptLoaded}
      >
        {isLoading ? (
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            正在載入...
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
            使用 Google 帳號登入
          </>
        )}
      </Button>
      
      {error && (
        <div className="text-red-500 text-sm mt-2 mb-2">
          {error}
        </div>
      )}
      
      <div id="google-signin-button" className="w-full mt-2 flex justify-center"></div>
      
      {/* 調試資訊區域 */}
      {debugInfo && debugInfo.length > 0 && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg text-xs text-gray-400 max-h-32 overflow-auto">
          <div className="font-semibold mb-1">調試記錄:</div>
          {debugInfo.map((info, index) => (
            <div key={index} className="mb-1">
              {info.timestamp.substring(11, 19)} - {info.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default GoogleLoginButton;