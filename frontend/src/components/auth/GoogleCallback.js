// 位置：frontend/src/components/auth/GoogleCallback.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CircularProgress, Typography, Box, Alert, Button } from '@mui/material';
import { handleGoogleCallback } from '../../utils/api';

const GoogleCallback = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const returnedState = params.get('state');
        const error = params.get('error');

        // 檢查是否有錯誤
        if (error) {
          throw new Error(`Google 登入錯誤: ${error}`);
        }

        // 詳細的 state 驗證日誌
        const savedState = sessionStorage.getItem('googleAuthState');
        console.log('State 驗證詳情:', {
          savedState,
          returnedState,
          savedStateExists: !!savedState,
          returnedStateExists: !!returnedState,
          match: savedState === returnedState,
          timestamp: new Date().toISOString()
        });

        // 驗證 state 參數
        if (!savedState || !returnedState) {
          console.warn('State 參數缺失:', {
            savedState: savedState ? '存在' : '不存在',
            returnedState: returnedState ? '存在' : '不存在',
            timestamp: new Date().toISOString()
          });
          console.log('繼續處理 Google 登入，即使缺少 state 參數');
        }

        // 取得儲存的 nonce
        const savedNonce = sessionStorage.getItem('googleAuthNonce');

        // 清除已使用的 state 和 nonce
        sessionStorage.removeItem('googleAuthState');
        sessionStorage.removeItem('googleAuthNonce');

        if (!code) {
          throw new Error('未收到授權碼');
        }

        // 使用新的 handleGoogleCallback 函數
        const response = await handleGoogleCallback(code, returnedState, savedNonce);

        // 根據用戶角色重定向
        if (response.user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (response.user.role === 'manager') {
          navigate('/manager/dashboard');
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('Google 回調處理錯誤:', {
          message: err.message,
          status: err.status,
          timestamp: new Date().toISOString()
        });
        setError(err.message || 'Google 登入處理失敗');
      } finally {
        setLoading(false);
      }
    };

    processCallback();
  }, [location, navigate]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} p={3}>
        <Typography variant="h6" color="error">
          登入失敗
        </Typography>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate('/login')}
          sx={{ mt: 2 }}
        >
          返回登入頁面
        </Button>
      </Box>
    );
  }

  return null;
};

export default GoogleCallback;