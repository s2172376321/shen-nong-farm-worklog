// 位置：frontend/src/components/auth/GoogleCallback.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // 檢查是否有錯誤參數
        const searchParams = new URLSearchParams(window.location.search);
        const error = searchParams.get('error');
        if (error) {
          console.error('Google 返回錯誤:', error);
          throw new Error(`Google 授權錯誤: ${error}`);
        }
  
        // 從 URL 中獲取 code
        const code = searchParams.get('code');
        
        if (!code) {
          throw new Error('未能獲取授權碼');
        }
        
        console.log('成功獲取到授權碼，長度:', code.length);
        
        // 使用授權碼登入
        const user = await loginWithGoogle(code);
        
        // 登入成功後導航
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('處理 Google 回調時出錯:', err);
        setError('Google 登入失敗，請重試');
        
        // 錯誤後返回登入頁
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };
    
    processCallback();
  }, [loginWithGoogle, navigate]);
  

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      {error ? (
        <div className="text-red-500 mb-4">{error}</div>
      ) : (
        <>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <div>處理 Google 登入中...</div>
        </>
      )}
    </div>
  );
};

export default GoogleCallback;