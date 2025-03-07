// frontend/src/components/user/UserSettings.js
import React from 'react';
import GoogleBind from './GoogleBind';
import { Card } from '../ui';

const UserSettings = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">用戶設定</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          {/* 其他設定選項 */}
          <h2 className="text-xl font-semibold mb-4">個人資料設定</h2>
          {/* 個人資料表單 */}
        </Card>
        
        <GoogleBind />
      </div>
    </div>
  );
};


export default UserSettings;