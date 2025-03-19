// frontend/src/components/user/UserSettings.js
import React from 'react';
import GoogleBind from './GoogleBind';
import ChangePassword from './ChangePassword';
import { Card } from '../ui';

const UserSettings = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">用戶設定</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 修改密碼區塊 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">修改密碼</h2>
          <ChangePassword />
        </Card>
        
        {/* Google 帳號綁定 */}
        <GoogleBind />
      </div>
    </div>
  );
};


export default UserSettings;