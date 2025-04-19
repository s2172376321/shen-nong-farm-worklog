// 位置：frontend/src/components/auth/GoogleCallback.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CircularProgress, Typography, Box, Alert, Button } from '@mui/material';
import api from '../../utils/api';

const GoogleCallback = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const returnedState = params.get('state');
        const error = params.get('error');

        // 檢查是否有錯誤
        if (error) {
          throw new Error(`Google 登入錯誤: ${error}`);
        }

        // 驗證 state 參數
        const savedState = localStorage.getItem('googleAuthState');
        if (!savedState || savedState !== returnedState) {
          throw new Error('無效的 state 參數，可能是 CSRF 攻擊');
        }

        // 清除已使用的 state
        localStorage.removeItem('googleAuthState');

        if (!code) {
          throw new Error('未收到授權碼');
        }

        // 取得儲存的 nonce
        const savedNonce = localStorage.getItem('googleAuthNonce');
        localStorage.removeItem('googleAuthNonce');

        console.log('發送 Google 回調請求:', {
          hasCode: !!code,
          hasState: !!returnedState,
          hasNonce: !!savedNonce,
          timestamp: new Date().toISOString()
        });

        // 發送授權碼到後端
        const response = await api.post('/auth/google/callback', {
          code,
          state: returnedState,
          nonce: savedNonce
        });

        if (response.data.token) {
          // 儲存用戶資訊
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          console.log('登入成功，準備重定向');
          
          // 根據用戶角色重定向
          if (response.data.user.role === 'admin') {
            navigate('/admin/dashboard');
          } else if (response.data.user.role === 'manager') {
            navigate('/manager/dashboard');
          } else {
            navigate('/dashboard');
          }
        } else {
          throw new Error('登入失敗：未收到 token');
        }
      } catch (err) {
        console.error('Google 回調處理錯誤:', {
          message: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
        setError(err.message || '登入處理過程發生錯誤');
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
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