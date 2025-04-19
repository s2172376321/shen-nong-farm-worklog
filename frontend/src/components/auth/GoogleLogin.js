// frontend/src/components/auth/GoogleLogin.js
import React, { useState } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';

export const GoogleLoginButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showError, setShowError] = useState(false);

  const generateState = () => {
    const array = new Uint32Array(8);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
  };

  const generateNonce = () => {
    const array = new Uint32Array(8);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setShowError(false);

      // 檢查必要的環境變數
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`;
      
      console.log('環境變數檢查:', {
        hasClientId: !!clientId,
        clientIdLength: clientId?.length,
        redirectUri,
        nodeEnv: process.env.NODE_ENV,
        envFile: '.env 文件已載入'
      });

      if (!clientId) {
        throw new Error('Google Client ID 未設置，請檢查環境變數');
      }

      const state = generateState();
      const nonce = generateNonce();
      
      // 儲存 state 和 nonce 到 localStorage (改用 localStorage 而不是 sessionStorage)
      localStorage.setItem('googleAuthState', state);
      localStorage.setItem('googleAuthNonce', nonce);
      
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state: state,
        nonce: nonce,
        access_type: 'offline',
        prompt: 'consent'
      });

      console.log('Google OAuth 配置:', {
        redirectUri,
        scope: 'openid email profile',
        responseType: 'code',
        accessType: 'offline',
        prompt: 'consent',
        authUrlLength: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      });

      // 重定向到 Google 登入頁面
      console.log('準備重定向到 Google 登入頁面');
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      
    } catch (err) {
      console.error('Google 登入錯誤:', {
        message: err.message,
        stack: err.stack,
        clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID ? '已設置' : '未設置',
        env: process.env.NODE_ENV,
        error: err
      });
      
      setError(err.message || 'Google 登入失敗，請稍後再試');
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseError = () => {
    setShowError(false);
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={<GoogleIcon />}
        onClick={handleGoogleLogin}
        disabled={isLoading}
        fullWidth
        sx={{
          mt: 2,
          mb: 2,
          backgroundColor: '#4285f4',
          '&:hover': {
            backgroundColor: '#357abd',
          },
        }}
      >
        {isLoading ? '登入中...' : '使用 Google 登入'}
      </Button>

      <Snackbar 
        open={showError} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      {process.env.NODE_ENV === 'development' && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          環境: {process.env.NODE_ENV}<br />
          Client ID: {process.env.REACT_APP_GOOGLE_CLIENT_ID ? '已設置' : '未設置'}
        </div>
      )}
    </>
  );
};

export default GoogleLoginButton;