// 前端註冊表單組件
import React, { useState, useEffect } from 'react';
import { Button, Input, Card } from '../ui';
import { registerUser } from '../../utils/api';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    department: '',
    position: ''
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);

  // 檢查使用者帳號可用性
  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length >= 6) {
        try {
          const response = await fetch(`/api/users/check-username/${formData.username}`);
          const data = await response.json();
          setUsernameAvailable(data.available);
        } catch (error) {
          console.error('檢查帳號可用性失敗:', error);
        }
      } else {
        setUsernameAvailable(null);
      }
    };

    // 使用節流函數減少請求頻率
    const timeoutId = setTimeout(() => {
      if (formData.username) {
        checkUsername();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await registerUser(formData);
      // 註冊成功後導向登入頁面
      window.location.href = '/login';
    } catch (err) {
      setError(err.response?.data?.message || '註冊失敗，請稍後再試');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">神農山莊</h2>
          <p className="text-gray-400">註冊新帳號</p>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">使用者帳號</label>
            <Input
              type="text"
              placeholder="帳號 (6-20字元，僅英文、數字和底線)"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
            />
            {usernameAvailable !== null && (
              <p className={`text-sm mt-1 ${usernameAvailable ? 'text-green-500' : 'text-red-500'}`}>
                {usernameAvailable ? '此帳號可以使用' : '此帳號已被使用'}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">電子郵件</label>
            <Input
              type="email"
              placeholder="電子郵件"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">密碼</label>
            <Input
              type="password"
              placeholder="密碼 (至少8字元，包含大小寫字母、數字和特殊符號)"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">姓名</label>
            <Input
              type="text"
              placeholder="姓名"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">部門</label>
            <Input
              type="text"
              placeholder="部門"
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">職位</label>
            <Input
              type="text"
              placeholder="職位"
              value={formData.position}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || usernameAvailable === false}
          >
            {isLoading ? '註冊中...' : '註冊'}
          </Button>
        </form>

        <div className="text-center mt-4">
          <p className="text-gray-400">
            已有帳號？
            <a 
              href="/login" 
              className="text-blue-400 hover:text-blue-300 ml-1"
            >
              登入
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;