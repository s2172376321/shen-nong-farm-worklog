// 位置：backend/websocket/index.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// 用户连接映射表
const connectedClients = new Map();

/**
 * 初始化WebSocket服务器
 * @param {object} server - HTTP服务器实例
 */
function initWebSocketServer(server) {
  console.log('初始化WebSocket服务器...');
  
  // 创建WebSocket服务器
  const wss = new WebSocket.Server({
    server,
    path: '/ws',  // 与前端配置的路径一致
    clientTracking: true,
  });

  // 连接事件
  wss.on('connection', async (ws, req) => {
    try {
      // 获取查询参数中的token
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token') || '';
      
      if (!token) {
        console.log('WebSocket连接尝试没有提供token');
        ws.close(4001, 'Authentication failed: No token provided');
        return;
      }
      
      // 验证token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      } catch (error) {
        console.error('WebSocket认证失败:', error.message);
        ws.close(4002, 'Authentication failed: Invalid token');
        return;
      }
      
      const userId = decoded.id;
      
      // 存储用户连接
      console.log(`用户 ${userId} WebSocket已连接`);
      connectedClients.set(userId, ws);
      
      // 发送欢迎消息
      sendToClient(ws, 'connected', {
        message: '成功连接到WebSocket服务',
        userId: userId
      });
      
      // 监听消息
      ws.on('message', (message) => handleMessage(ws, message, userId));
      
      // 监听关闭
      ws.on('close', () => {
        console.log(`用户 ${userId} WebSocket已断开`);
        connectedClients.delete(userId);
      });
      
      // 错误处理
      ws.on('error', (error) => {
        console.error(`WebSocket错误(用户 ${userId}):`, error);
      });
      
    } catch (error) {
      console.error('处理WebSocket连接时发生错误:', error);
      ws.close(4000, 'Internal server error');
    }
  });
  
  // 服务器错误处理
  wss.on('error', (error) => {
    console.error('WebSocket服务器错误:', error);
  });
  
  console.log('WebSocket服务器初始化完成');
  return wss;
}

/**
 * 处理接收到的消息
 * @param {WebSocket} ws - WebSocket连接
 * @param {string} message - 接收到的消息
 * @param {string} userId - 用户ID
 */
function handleMessage(ws, message, userId) {
  try {
    const data = JSON.parse(message);
    console.log(`收到来自用户 ${userId} 的消息:`, data);
    
    // 根据消息类型进行处理
    switch (data.type) {
      case 'ping':
        sendToClient(ws, 'pong', { time: new Date().toISOString() });
        break;
        
      default:
        console.log(`未知消息类型: ${data.type}`);
        sendToClient(ws, 'error', { message: '未知消息类型' });
    }
    
  } catch (error) {
    console.error('处理WebSocket消息时发生错误:', error);
    sendToClient(ws, 'error', { message: '消息格式不正确' });
  }
}

/**
 * 向客户端发送消息
 * @param {WebSocket} ws - WebSocket连接
 * @param {string} type - 消息类型
 * @param {object} data - 消息数据
 */
function sendToClient(ws, type, data) {
  if (ws.readyState === WebSocket.OPEN) {
    const message = JSON.stringify({ type, data });
    ws.send(message);
  }
}

/**
 * 向特定用户发送消息
 * @param {string} userId - 用户ID
 * @param {string} type - 消息类型
 * @param {object} data - 消息数据
 * @returns {boolean} 是否发送成功
 */
function sendToUser(userId, type, data) {
  const ws = connectedClients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendToClient(ws, type, data);
    return true;
  }
  return false;
}

/**
 * 向所有连接的用户广播消息
 * @param {string} type - 消息类型
 * @param {object} data - 消息数据
 * @param {array} excludeUsers - 排除的用户ID数组
 */
function broadcast(type, data, excludeUsers = []) {
  connectedClients.forEach((ws, userId) => {
    if (!excludeUsers.includes(userId) && ws.readyState === WebSocket.OPEN) {
      sendToClient(ws, type, data);
    }
  });
}

// 导出WebSocket功能
module.exports = {
  initWebSocketServer,
  sendToUser,
  broadcast
};