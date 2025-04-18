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
        setUsers(data);
        setIsLoading(false);
      } catch (err) {
        setError('載入使用者失敗');
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);

  // 檢查使用者帳號可用性
  useEffect(() => {
    const checkUsername = async () => {
      if (newUser.username.length >= 6) {
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

    // 使用節流函數減少請求頻率
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
      setUsers([...users, response.user]);
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
    } catch (err) {
      setError(err.response?.data?.message || '創建使用者失敗');
    }
  };

  // 更新使用者
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const response = await updateUser(selectedUser.id, {
        username: selectedUser.username,
        email: selectedUser.email,
        name: selectedUser.name,
        department: selectedUser.department,
        position: selectedUser.position,
        role: selectedUser.role
      });
      setUsers(users.map(u => u.id === selectedUser.id ? response.user : u));
      setSelectedUser(null);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || '更新使用者失敗');
    }
  };

  // 刪除使用者
  const handleDeleteUser = async (userId) => {
    try {
      await deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || '刪除使用者失敗');
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
              placeholder="帳號 (4-20字元，僅英文、數字和底線)"
              value={selectedUser ? selectedUser.username : newUser.username}
              onChange={(e) => 
                selectedUser
                  ? setSelectedUser({...selectedUser, username: e.target.value})
                  : setNewUser({...newUser, username: e.target.value})
              }
              required
              disabled={!!selectedUser} // 編輯模式下不允許修改帳號
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
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">角色</label>
            <select
              value={selectedUser ? selectedUser.role : newUser.role}
              onChange={(e) => 
                selectedUser
                  ? setSelectedUser({...selectedUser, role: e.target.value})
                  : setNewUser({...newUser, role: e.target.value})
              }
              className="w-full bg-gray-700 text-white p-2 rounded-lg"
            >
              <option value="user">一般使用者</option>
              <option value="admin">管理員</option>
            </select>
          </div>
          
          <div className="md:col-span-2 flex space-x-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={!selectedUser && usernameAvailable === false}
            >
              {selectedUser ? '更新' : '新增'}
            </Button>
            {selectedUser && (
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setSelectedUser(null)}
                className="w-full"
              >
                取消
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* 使用者列表 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">使用者列表</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-3 text-left">帳號</th>
                <th className="p-3 text-left">電子郵件</th>
                <th className="p-3 text-left">姓名</th>
                <th className="p-3 text-left">部門</th>
                <th className="p-3 text-left">職位</th>
                <th className="p-3 text-left">角色</th>
                <th className="p-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-gray-700">
                  <td className="p-3">{user.username}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{user.department}</td>
                  <td className="p-3">{user.position}</td>
                  <td className="p-3">
                    {user.role === 'admin' ? '管理員' : '一般使用者'}
                  </td>
                  <td className="p-3 space-x-2">
                    <Button 
                      onClick={() => setSelectedUser(user)}
                      className="px-2 py-1 text-sm"
                    >
                      編輯
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => handleDeleteUser(user.id)}
                      className="px-2 py-1 text-sm"
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