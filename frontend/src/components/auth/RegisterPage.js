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
      if (formData.username.length >= 4) {
        try {
          const response = await fetch(`/users/check-username/${formData.username}`);
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
    if (isLoading) return;
    
    // 驗證表單
    if (!formData.username || !formData.password || !formData.confirmPassword) {
      setError('請填寫所有欄位');
      return;
    }
    
    // 驗證使用者名稱格式 (4-20位英文字母和數字)
    const usernameRegex = /^[a-zA-Z0-9]{4,20}$/;
    if (!usernameRegex.test(formData.username)) {
      setError('使用者名稱必須是4-20位英文字母和數字');
      return;
    }
    
    // 驗證密碼長度 (至少8個字元)
    if (formData.password.length < 8) {
      setError('密碼必須至少8個字元');
      return;
    }
    
    // 驗證密碼確認
    if (formData.password !== formData.confirmPassword) {
      setError('兩次輸入的密碼不一致');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 檢查使用者名稱是否可用
      const availabilityCheck = await checkUsernameAvailability(formData.username);
      
      if (!availabilityCheck.available) {
        setError('此使用者名稱已被使用');
        setIsLoading(false);
        return;
      }
      
      // 註冊使用者
      await registerUser(formData);
      
      // 註冊成功後自動登入
      const loginSuccess = await login(formData.username, formData.password);
      
      if (loginSuccess) {
        navigate('/dashboard');
      } else {
        setError('註冊成功，但自動登入失敗，請手動登入');
      }
    } catch (err) {
      console.error('註冊失敗:', err);
      
      if (err.response) {
        switch (err.response.status) {
          case 400:
            setError(err.response.data?.message || '註冊資料格式錯誤');
            break;
          case 409:
            setError('此使用者名稱已被使用');
            break;
          case 500:
            setError('伺服器錯誤，請稍後再試');
            break;
          default:
            setError(err.response.data?.message || '註冊失敗，請稍後再試');
        }
      } else if (err.request) {
        setError('無法連接到伺服器，請檢查網路連接');
      } else {
        setError(err.message || '註冊過程中發生未知錯誤');
      }
    } finally {
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
            <Input 
              type="text" 
              placeholder="使用者帳號 (4-20位英文字母和數字)" 
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              disabled={isLoading}
              required
              pattern="[a-zA-Z0-9]{4,20}"
              title="請輸入4-20位英文字母和數字"
            />
          </div>
          <div>
            <Input 
              type="password" 
              placeholder="密碼 (至少8個字元)" 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              disabled={isLoading}
              required
              minLength="8"
              title="密碼必須至少8個字元"
            />
          </div>
          <div>
            <Input 
              type="password" 
              placeholder="確認密碼" 
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              disabled={isLoading}
              required
              minLength="8"
              title="密碼必須至少8個字元"
            />
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