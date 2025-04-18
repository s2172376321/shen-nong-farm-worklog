// frontend/src/components/auth/GoogleLogin.js
import React, { useState } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';

export const GoogleLoginButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showError, setShowError] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setShowError(false);

      // 檢查必要的環境變數
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      console.log('環境變數檢查:', {
        hasClientId: !!clientId,
        clientIdLength: clientId?.length,
        nodeEnv: process.env.NODE_ENV,
        envFile: '.env 文件已載入'
      });

      if (!clientId) {
        throw new Error('Google Client ID 未設置，請檢查環境變數');
      }

      // 構建 Google OAuth URL
      const redirectUri = 'http://localhost:5000/api/auth/google/callback';
      const scope = 'email profile';
      const responseType = 'code';
      const accessType = 'offline';
      const prompt = 'consent';

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scope)}` +
        `&response_type=${encodeURIComponent(responseType)}` +
        `&access_type=${encodeURIComponent(accessType)}` +
        `&prompt=${encodeURIComponent(prompt)}`;

      console.log('Google OAuth 配置:', {
        redirectUri,
        scope,
        responseType,
        accessType,
        prompt,
        authUrlLength: authUrl.length
      });

      // 重定向到 Google 登入頁面
      console.log('準備重定向到 Google 登入頁面');
      window.location.href = authUrl;
      
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