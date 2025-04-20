// 位置：frontend/src/components/admin/UserManagement.js
import React, { useState, useEffect } from 'react';
import { fetchUsers, createUser, updateUser, deleteUser, checkUsernameAvailability } from '../../utils/api';
import { Button, Input } from '../ui';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    department: '',
    position: '',
    role: 'user'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [usernameAvailable, setUsernameAvailable] = useState(null);

  // 載入使用者列表
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await fetchUsers();
        // 確保返回的數據是數組
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          console.error('獲取到的用戶數據格式不正確:', data);
          setUsers([]);
          setError('獲取用戶數據格式不正確');
        }
      } catch (err) {
        console.error('載入使用者失敗:', err);
        setError(err.message || '載入使用者失敗');
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);

  // 檢查使用者帳號可用性
  useEffect(() => {
    const checkUsername = async () => {
      if (newUser.username.length >= 4) {  // 修改為最小長度4
        try {
          const response = await checkUsernameAvailability(newUser.username);
          setUsernameAvailable(response.available);
        } catch (err) {
          console.error('檢查帳號可用性失敗:', err);
        }
      } else {
        setUsernameAvailable(null);
      }
    };

    const timeoutId = setTimeout(() => {
      if (newUser.username && !selectedUser) {
        checkUsername();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [newUser.username, selectedUser]);

  // 創建新使用者
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await createUser(newUser);
      if (response && response.user) {
        setUsers(prevUsers => [...prevUsers, response.user]);
        setNewUser({
          username: '',
          email: '',
          password: '',
          name: '',
          department: '',
          position: '',
          role: 'user'
        });
        setUsernameAvailable(null);
        setError(null);
      } else {
        throw new Error('創建用戶響應格式不正確');
      }
    } catch (err) {
      console.error('創建使用者失敗:', err);
      setError(err.response?.data?.message || err.message || '創建使用者失敗');
    }
  };

  // 更新使用者
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const response = await updateUser(selectedUser.id, {
        email: selectedUser.email,
        name: selectedUser.name,
        department: selectedUser.department,
        position: selectedUser.position,
        role: selectedUser.role
      });
      if (response && response.user) {
        setUsers(prevUsers => prevUsers.map(u => u.id === selectedUser.id ? response.user : u));
        setSelectedUser(null);
        setError(null);
      } else {
        throw new Error('更新用戶響應格式不正確');
      }
    } catch (err) {
      console.error('更新使用者失敗:', err);
      setError(err.response?.data?.message || err.message || '更新使用者失敗');
    }
  };

  // 刪除使用者
  const handleDeleteUser = async (userId) => {
    if (!userId) return;
    try {
      await deleteUser(userId);
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      setError(null);
    } catch (err) {
      console.error('刪除使用者失敗:', err);
      setError(err.response?.data?.message || err.message || '刪除使用者失敗');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">使用者管理</h1>

      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* 新增使用者表單 */}
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {selectedUser ? '編輯使用者' : '新增使用者'}
        </h2>
        <form 
          onSubmit={selectedUser ? handleUpdateUser : handleCreateUser} 
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm text-gray-400 mb-1">使用者帳號</label>
            <Input
              type="text"
              placeholder="帳號 (4-20字元，僅數字)"
              value={selectedUser ? selectedUser.username : newUser.username}
              onChange={(e) => 
                selectedUser
                  ? setSelectedUser({...selectedUser, username: e.target.value})
                  : setNewUser({...newUser, username: e.target.value})
              }
              required
              disabled={!!selectedUser}
              pattern="\d{4,20}"
              title="帳號必須是4-20位數字"
            />
            {!selectedUser && usernameAvailable !== null && (
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
              value={selectedUser ? selectedUser.email : newUser.email}
              onChange={(e) => 
                selectedUser
                  ? setSelectedUser({...selectedUser, email: e.target.value})
                  : setNewUser({...newUser, email: e.target.value})
              }
              required
            />
          </div>
          
          {!selectedUser && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">密碼</label>
              <Input
                type="password"
                placeholder="密碼 (至少8字元)"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                required
                minLength={8}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">姓名</label>
            <Input
              type="text"
              placeholder="姓名"
              value={selectedUser ? selectedUser.name : newUser.name}
              onChange={(e) => 
                selectedUser
                  ? setSelectedUser({...selectedUser, name: e.target.value})
                  : setNewUser({...newUser, name: e.target.value})
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">部門</label>
            <Input
              type="text"
              placeholder="部門"
              value={selectedUser ? selectedUser.department : newUser.department}
              onChange={(e) => 
                selectedUser
                  ? setSelectedUser({...selectedUser, department: e.target.value})
                  : setNewUser({...newUser, department: e.target.value})
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">職位</label>
            <Input
              type="text"
              placeholder="職位"
              value={selectedUser ? selectedUser.position : newUser.position}
              onChange={(e) => 
                selectedUser
                  ? setSelectedUser({...selectedUser, position: e.target.value})
                  : setNewUser({...newUser, position: e.target.value})
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">角色</label>
            <select
              className="w-full bg-gray-700 text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedUser ? selectedUser.role : newUser.role}
              onChange={(e) => 
                selectedUser
                  ? setSelectedUser({...selectedUser, role: e.target.value})
                  : setNewUser({...newUser, role: e.target.value})
              }
              required
            >
              <option value="user">一般使用者</option>
              <option value="admin">管理員</option>
            </select>
          </div>

          <div className="col-span-2">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {selectedUser ? '更新' : '新增'}
            </Button>
          </div>
        </form>
      </div>

      {/* 使用者列表 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">使用者列表</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-900 text-white">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">帳號</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">電子郵件</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">部門</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">職位</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">角色</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.position}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.role === 'admin' ? '管理員' : '一般使用者'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button
                      onClick={() => setSelectedUser(user)}
                      className="mr-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded"
                    >
                      編輯
                    </Button>
                    <Button
                      onClick={() => handleDeleteUser(user.id)}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                    >
                      刪除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;