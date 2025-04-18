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
  const [success, setSuccess] = useState(null);
  
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
  }, []);
  
  // 初始化 Google 登入
  const initializeGoogleSignIn = () => {
    logDebug('嘗試初始化 Google 登入');
    
    if (!window.google || !window.google.accounts) {
      logDebug('等待 Google API 載入');
      setTimeout(initializeGoogleSignIn, 1000);
      return;
    }
    
    try {
      // 獲取 Google Client ID
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      logDebug('使用 Client ID', { clientIdLength: clientId?.length });
      
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
        return;
      }
      
      logDebug('渲染 Google 按鈕');
      // 渲染按鈕
      window.google.accounts.id.renderButton(
        buttonContainer,
        { 
          type: 'standard',
          theme: 'outline', 
          size: 'large', 
          text: 'signin_with',
          width: 250,
          logo_alignment: 'center'
        }
      );
      
      // 一次性顯示 One Tap 提示
      window.google.accounts.id.prompt((notification) => {
        logDebug('One Tap 提示狀態', {
          isDisplayed: !notification.isNotDisplayed(),
          isSkipped: notification.isSkippedMoment(),
          reason: notification.getNotDisplayedReason() || notification.getSkippedReason()
        });
      });
      
      logDebug('Google 登入已初始化完成');
      setScriptLoaded(true);
    } catch (error) {
      logDebug('初始化 Google 登入失敗', { error: error.message });
      setError('初始化 Google 登入失敗: ' + error.message);
    }
  };
  
  // 處理 Google 回調
  const handleGoogleResponse = async (response) => {
    logDebug('收到 Google 回應', { 
      hasCredential: !!response?.credential,
      credentialLength: response?.credential?.length
    });
    
    if (!response?.credential) {
      logDebug('Google 回應缺少憑證', { response });
      setError('登入失敗：未收到有效的 Google 憑證');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      logDebug('準備調用 loginWithGoogle', {
        credentialLength: response.credential.length
      });
      
      const result = await loginWithGoogle(response.credential);
      
      logDebug('Google 登入 API 調用完成', { 
        success: !!result,
        hasUser: !!result?.user,
        hasToken: !!result?.token
      });
      
      if (!result?.token) {
        throw new Error('登入失敗：未收到授權令牌');
      }
      
      setSuccess('登入成功！正在跳轉...');
      setIsLoading(false);
      
    } catch (error) {
      logDebug('Google 登入失敗', { 
        error: error.message,
        response: error.response?.data
      });
      
      setError(error.message || '登入失敗，請稍後再試');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div id="google-signin-button" className="w-full flex justify-center mb-4"></div>
      
      {error && (
        <div className="text-red-500 text-sm mt-2 mb-2">
          {error}
        </div>
      )}
      
      {success && (
        <div className="text-green-500 text-sm mt-2 mb-2">
          {success}
        </div>
      )}
      
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
    </div>
  );
};

export default GoogleLoginButton;