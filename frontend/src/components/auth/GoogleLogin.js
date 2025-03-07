// 位置：frontend/src/components/auth/GoogleLogin.js
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui';

export const GoogleLoginButton = () => {
  const { loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      // 使用 Google 登入 SDK
      const googleUser = await new Promise((resolve, reject) => {
        window.gapi.load('auth2', () => {
          const auth2 = window.gapi.auth2.init({
            client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
            scope: 'email profile'
          });

          auth2.signIn({
            scope: 'email profile'
          }).then(
            googleUser => resolve(googleUser),
            error => reject(error)
          );
        });
      });

      // 取得 ID Token
      const idToken = googleUser.getAuthResponse().id_token;

      // 呼叫登入方法
      await loginWithGoogle(idToken);

      // 登入成功後導向主頁
      window.location.href = '/work-log';
    } catch (error) {
      console.error('Google 登入失敗', error);
      
      // 顯示錯誤訊息
      alert('Google 登入失敗，請稍後再試');
    }
  };

  // 載入 Google 登入 SDK
  React.useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/platform.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <Button 
      onClick={handleGoogleLogin}
      variant="outline"
      className="w-full flex items-center justify-center"
    >
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
    </Button>
  );
};

export default GoogleLoginButton;