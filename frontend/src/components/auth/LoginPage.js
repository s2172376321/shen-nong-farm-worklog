// 位置：frontend/src/components/auth/LoginPage.js
import React, { useState } from 'react';
import { Button, Input, Card } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { GoogleLoginButton } from './GoogleLogin';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      
      // 根據角色重定向
      if (user.role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/work-log';
      }
    } catch (err) {
      setError('登入失敗，請檢查帳號密碼');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">神農山莊</h2>
          <p className="text-gray-400">工作日誌系統</p>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Input 
              type="email" 
              placeholder="電子郵件" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Input 
              type="password" 
              placeholder="密碼" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full"
          >
            登入
          </Button>
        </form>

        <div className="my-4 flex items-center">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="mx-4 text-gray-400">或</span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>

        <GoogleLoginButton />

        <div className="text-center mt-4">
          <a 
            href="/forgot-password" 
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            忘記密碼？
          </a>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;