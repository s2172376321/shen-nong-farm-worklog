// 位置：frontend/src/components/auth/GoogleCallback.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircularProgress, Typography, Box, Alert } from '@mui/material';
import axios from 'axios';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 從 URL 獲取參數
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        console.log('Google 回調參數:', {
          hasCode: !!code,
          codeLength: code?.length,
          hasState: !!state,
          stateLength: state?.length,
          error,
          timestamp: new Date().toISOString()
        });

        // 檢查錯誤
        if (error) {
          throw new Error(`Google 授權錯誤: ${error}`);
        }

        // 檢查必要參數
        if (!code) {
          throw new Error('未收到授權碼');
        }

        // 從 sessionStorage 獲取並驗證 state
        const storedState = sessionStorage.getItem('googleAuthState');
        const storedNonce = sessionStorage.getItem('googleAuthNonce');

        console.log('Session 存儲狀態:', {
          hasStoredState: !!storedState,
          storedStateLength: storedState?.length,
          hasStoredNonce: !!storedNonce,
          storedNonceLength: storedNonce?.length
        });

        if (state !== storedState) {
          console.error('State 不匹配:', {
            receivedState: state,
            storedState: storedState
          });
          throw new Error('安全驗證失敗：state 不匹配');
        }

        // 準備請求數據
        const callbackData = {
          code,
          state,
          nonce: storedNonce,
          redirect_uri: `${window.location.origin}/auth/google/callback`
        };

        console.log('準備發送回調請求:', {
          endpoint: `${process.env.REACT_APP_API_URL}/auth/google/callback`,
          hasCallbackData: !!callbackData,
          timestamp: new Date().toISOString()
        });

        // 發送請求到後端
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/auth/google/callback`,
          callbackData,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            withCredentials: true
          }
        );

        console.log('回調請求成功:', {
          status: response.status,
          hasData: !!response.data,
          timestamp: new Date().toISOString()
        });

        // 清理 session storage
        sessionStorage.removeItem('googleAuthState');
        sessionStorage.removeItem('googleAuthNonce');

        // 處理成功響應
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          navigate('/dashboard');
        } else {
          throw new Error('未收到有效的認證令牌');
        }

      } catch (err) {
        console.error('Google 回調處理錯誤:', {
          message: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString(),
          error: err
        });

        setError(err.message || '登入處理失敗，請稍後再試');
        setTimeout(() => navigate('/login'), 5000);
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        p={3}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="textSecondary">
          5 秒後將返回登入頁面...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      p={3}
    >
      <CircularProgress sx={{ mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        處理 Google 登入中...
      </Typography>
      <Typography variant="body2" color="textSecondary">
        請稍候，我們正在驗證您的身份
      </Typography>
    </Box>
  );
};

export default GoogleCallback;