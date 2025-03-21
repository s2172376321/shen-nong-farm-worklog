// 位置: backend/services/websocketService.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * WebSocket服务类
 * 提供实时通信功能，包括用户认证、消息处理和广播
 */
class WebSocketService {
  constructor(server) {
    // 初始化WebSocket服务器
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws' // WebSocket路径
    });
    
    // 管理所有活跃连接
    this.connections = new Map();
    
    // 设置事件处理器
    this.setupEventHandlers();
    
    console.log('WebSocket服务已初始化');
  }
  
  /**
   * 设置WebSocket服务器的事件处理
   */
  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      // 为每个连接创建唯一ID
      const connectionId = this.generateConnectionId();
      
      // 临时存储连接信息
      ws.connectionId = connectionId;
      ws.isAlive = true;
      ws.user = null; // 用户信息，认证后设置
      
      console.log(`新的WebSocket连接 (${connectionId})`);
      
      // 设置ping处理以保持连接活跃
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      // 处理接收到的消息
      ws.on('message', async (message) => {
        try {
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('处理WebSocket消息错误:', error);
          this.sendError(ws, 'message_error', '处理消息时发生错误');
        }
      });
      
      // 处理连接关闭
      ws.on('close', () => {
        console.log(`WebSocket连接关闭 (${connectionId})`);
        // 从连接Map中移除
        this.connections.delete(connectionId);
        
        // 如果用户已认证，更新其在线状态
        if (ws.user) {
          this.updateUserStatus(ws.user.id, false);
        }
      });
      
      // 处理错误
      ws.on('error', (error) => {
        console.error(`WebSocket错误 (${connectionId}):`, error);
      });
      
      // 发送欢迎消息
      this.sendToClient(ws, {
        type: 'welcome',
        message: '欢迎连接到神农山莊WebSocket服务',
        connectionId
      });
    });
    
    // 设置心跳检测，每30秒检测一次
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          console.log(`关闭不活跃的连接 (${ws.connectionId})`);
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }
  
  /**
   * 处理接收到的消息
   */
  async handleMessage(ws, message) {
    let parsedMessage;
    
    try {
      parsedMessage = JSON.parse(message);
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
      return this.sendError(ws, 'parse_error', '无效的JSON格式');
    }
    
    const { type, data } = parsedMessage;
    
    // 验证消息类型
    if (!type) {
      return this.sendError(ws, 'invalid_message', '消息缺少type字段');
    }
    
    // 根据消息类型处理
    switch (type) {
      case 'authenticate':
        await this.authenticateClient(ws, data);
        break;
        
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
        break;
        
      case 'get_online_users':
        // 仅管理员可以获取在线用户列表
        if (ws.user && ws.user.role === 'admin') {
          this.sendOnlineUsersList(ws);
        } else {
          this.sendError(ws, 'unauthorized', '无权获取在线用户列表');
        }
        break;
        
      case 'notice_broadcast':
        // 仅管理员可以广播通知
        if (ws.user && ws.user.role === 'admin') {
          this.broadcastNotice(data, ws.user);
        } else {
          this.sendError(ws, 'unauthorized', '无权发送广播通知');
        }
        break;
        
      default:
        console.warn(`未知的消息类型: ${type}`);
        this.sendError(ws, 'unknown_type', `未知的消息类型: ${type}`);
    }
  }
  
  /**
   * 验证客户端JWT认证
   */
  async authenticateClient(ws, data) {
    if (!data || !data.token) {
      return this.sendError(ws, 'auth_error', '缺少认证令牌');
    }
    
    try {
      // 验证JWT令牌
      const decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'fallback_secret');
      
      // 从数据库获取完整用户信息
      const userQuery = await db.query(
        'SELECT id, username, email, role FROM users WHERE id = $1', 
        [decoded.id]
      );
      
      if (userQuery.rows.length === 0) {
        return this.sendError(ws, 'auth_error', '用户不存在');
      }
      
      const user = userQuery.rows[0];
      
      // 设置用户信息
      ws.user = user;
      
      // 将连接添加到连接Map
      this.connections.set(ws.connectionId, {
        ws,
        user,
        connectedAt: new Date()
      });
      
      // 更新用户在线状态
      await this.updateUserStatus(user.id, true);
      
      // 发送认证成功消息
      this.sendToClient(ws, {
        type: 'authenticated',
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
      
      console.log(`用户认证成功: ${user.username} (${user.id})`);
      
      // 发送未读通知数量
      this.sendUnreadNoticeCount(ws);
      
    } catch (error) {
      console.error('认证错误:', error);
      this.sendError(ws, 'auth_error', '认证失败: ' + (error.name === 'TokenExpiredError' ? '令牌已过期' : '无效的令牌'));
    }
  }
  
  /**
   * 更新用户在线状态
   */
  async updateUserStatus(userId, isOnline) {
    try {
      // 可选: 更新数据库中的用户在线状态
      // await db.query('UPDATE users SET is_online = $1, last_online = CURRENT_TIMESTAMP WHERE id = $2', [isOnline, userId]);
    } catch (error) {
      console.error('更新用户在线状态失败:', error);
    }
  }
  
  /**
   * 发送未读通知数量给用户
   */
  async sendUnreadNoticeCount(ws) {
    if (!ws.user) return;
    
    try {
      // 查询未读通知数量
      const query = `
        SELECT COUNT(*) as unread_count
        FROM notices n
        LEFT JOIN notice_reads nr ON n.id = nr.notice_id AND nr.user_id = $1
        WHERE nr.id IS NULL
        AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
      `;
      
      const result = await db.query(query, [ws.user.id]);
      const unreadCount = parseInt(result.rows[0].unread_count, 10);
      
      // 发送未读通知数量
      this.sendToClient(ws, {
        type: 'unread_notices',
        count: unreadCount
      });
    } catch (error) {
      console.error('获取未读通知数量失败:', error);
    }
  }
  
  /**
   * 广播通知给所有在线用户
   */
  broadcastNotice(data, sender) {
    if (!data || !data.message) {
      return false;
    }
    
    const broadcastMessage = {
      type: 'notice',
      message: data.message,
      title: data.title || '系统通知',
      sender: sender ? { id: sender.id, username: sender.username } : { id: 'system', username: '系统' },
      timestamp: Date.now()
    };
    
    // 给所有认证用户发送通知
    let sentCount = 0;
    this.connections.forEach((connection) => {
      if (connection.user) {
        this.sendToClient(connection.ws, broadcastMessage);
        sentCount++;
      }
    });
    
    console.log(`已向 ${sentCount} 名在线用户广播通知`);
    return true;
  }
  
  /**
   * 发送在线用户列表给请求者
   */
  sendOnlineUsersList(ws) {
    // 收集在线用户信息
    const onlineUsers = [];
    this.connections.forEach((connection) => {
      if (connection.user) {
        onlineUsers.push({
          id: connection.user.id,
          username: connection.user.username,
          role: connection.user.role,
          connectedAt: connection.connectedAt
        });
      }
    });
    
    // 发送在线用户列表
    this.sendToClient(ws, {
      type: 'online_users',
      users: onlineUsers,
      count: onlineUsers.length
    });
  }
  
  /**
   * 向特定用户发送通知
   */
  sendNoticeToUser(userId, notice) {
    let sent = false;
    
    // 查找用户的所有连接
    this.connections.forEach((connection) => {
      if (connection.user && connection.user.id === userId) {
        this.sendToClient(connection.ws, {
          type: 'notice',
          ...notice,
          timestamp: notice.timestamp || Date.now()
        });
        sent = true;
      }
    });
    
    return sent;
  }
  
  /**
   * 向客户端发送错误消息
   */
  sendError(ws, code, message) {
    this.sendToClient(ws, {
      type: 'error',
      code,
      message
    });
  }
  
  /**
   * 向客户端发送消息
   */
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('发送WebSocket消息失败:', error);
      }
    }
  }
  
  /**
   * 生成唯一连接ID
   */
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 获取在线用户数量
   */
  getOnlineUsersCount() {
    let count = 0;
    this.connections.forEach((connection) => {
      if (connection.user) {
        count++;
      }
    });
    return count;
  }
  
  /**
   * 关闭所有连接并清理资源
   */
  close() {
    this.wss.clients.forEach((client) => {
      client.terminate();
    });
    this.wss.close();
    console.log('WebSocket服务已关闭');
  }
}

module.exports = WebSocketService;