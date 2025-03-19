// 位置：frontend/src/components/user/ChangePassword.js
import React, { useState } from 'react';
import { Button, Input } from '../ui';
import { changePassword } from '../../utils/api';

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 驗證確認密碼
    if (formData.newPassword !== formData.confirmPassword) {
      setError('新密碼與確認密碼不符');
      return;
    }

    // 驗證密碼強度
    if (formData.newPassword.length < 8) {
      setError('新密碼長度必須至少8個字元');
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(formData.oldPassword, formData.newPassword);
      setSuccess('密碼修改成功');
      setError(null);
      // 清空表單
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || '密碼修改失敗');
      setSuccess(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-600 text-white p-3 rounded-lg mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2">目前密碼</label>
          <Input
            type="password"
            name="oldPassword"
            value={formData.oldPassword}
            onChange={handleChange}
            required
            placeholder="請輸入目前密碼"
          />
        </div>
        
        <div>
          <label className="block mb-2">新密碼</label>
          <Input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            required
            placeholder="請輸入新密碼"
          />
        </div>
        
        <div>
          <label className="block mb-2">確認新密碼</label>
          <Input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            placeholder="請再次輸入新密碼"
          />
        </div>
        
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? '處理中...' : '更新密碼'}
        </Button>
      </form>
    </div>
  );
};

export default ChangePassword;