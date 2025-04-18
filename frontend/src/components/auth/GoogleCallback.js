// 位置：frontend/src/components/auth/GoogleCallback.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CircularProgress, Typography, Box, Alert } from '@mui/material';
import api from '../../utils/api';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Processing Google OAuth callback...');
        
        // 從 URL 獲取授權碼
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        // 記錄回調參數
        console.log('Callback parameters:', {
          hasCode: !!code,
          error: error || 'none',
          fullUrl: window.location.href
        });

        if (error) {
          throw new Error(`Google 授權錯誤: ${error}`);
        }

        if (!code) {
          throw new Error('未收到授權碼');
        }

        console.log('Sending authorization code to backend...');
        
        // 發送授權碼到後端
        const response = await api.post('/auth/google/callback', { code });
        
        console.log('Backend response received:', {
          success: !!response.data,
          hasToken: !!response.data?.token,
          userRole: response.data?.user?.role
        });
        
        if (response.data.token) {
          // 儲存 token
          localStorage.setItem('token', response.data.token);
          
          // 根據用戶角色重定向
          const role = response.data.user?.role || 'user';
          const redirectPath = {
            admin: '/admin/dashboard',
            manager: '/manager/dashboard',
            user: '/dashboard'
          }[role] || '/dashboard';

          console.log(`Redirecting to ${redirectPath} for role: ${role}`);
          navigate(redirectPath);
        } else {
          throw new Error('登入失敗：未收到認證令牌');
        }
      } catch (err) {
        console.error('Google callback error:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          stack: err.stack
        });
        
        // 根據錯誤類型設置不同的錯誤消息
        let errorMessage = '處理 Google 登入時發生錯誤';
        if (err.response) {
          switch (err.response.status) {
            case 400:
              errorMessage = '無效的授權請求';
              break;
            case 401:
              errorMessage = '授權失敗';
              break;
            case 500:
              errorMessage = '伺服器處理登入時發生錯誤';
              break;
            default:
              errorMessage = err.response.data?.message || errorMessage;
          }
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [navigate, location]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          正在處理 Google 登入...
        </Typography>
      </Box>
    );
  }

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
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 400 }}>
          {error}
        </Alert>
        <Typography
          sx={{ 
            mt: 2, 
            cursor: 'pointer', 
            color: 'primary.main',
            '&:hover': {
              textDecoration: 'underline'
            }
          }}
          onClick={() => navigate('/login')}
        >
          返回登入頁面
        </Typography>
      </Box>
    );
  }

  return null;
};

export default GoogleCallback;