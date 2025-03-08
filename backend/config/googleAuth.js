// 位置：backend/config/googleAuth.js
const { OAuth2Client } = require('google-auth-library');
const fetch = require('node-fetch');

class GoogleAuthService {
  constructor() {
    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // 驗證 Google Token (支持 ID Token 和 授權碼)
  async verifyToken(token) {
    try {
      // 檢測 token 類型
      if (token.startsWith('eyJ')) {
        // 這是 ID Token (JWT 格式)
        return await this._verifyIdToken(token);
      } else {
        // 這可能是授權碼，嘗試使用授權碼獲取用戶資訊
        return await this._exchangeCodeAndGetUserInfo(token);
      }
    } catch (error) {
      console.error('Google Token 驗證失敗:', error);
      throw new Error('Google 登入驗證失敗');
    }
  }

  // 驗證 ID Token
  async _verifyIdToken(idToken) {
    const ticket = await this.client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    return {
      googleId: payload['sub'],
      email: payload['email'],
      username: payload['name'],
      profileImage: payload['picture']
    };
  }

  // 用授權碼交換 Token 並獲取用戶資訊
  async _exchangeCodeAndGetUserInfo(code) {
    try {
      // 交換授權碼獲取 token
      const { tokens } = await this.client.getToken(code);
      const accessToken = tokens.access_token;

      // 使用 access token 獲取用戶資訊
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error(`Google API 回應錯誤: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        googleId: data.id,
        email: data.email,
        username: data.name,
        profileImage: data.picture
      };
    } catch (error) {
      console.error('獲取 Google 用戶資訊失敗:', error);
      throw error;
    }
  }

  // 產生 Google 登入 URL
  generateAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    });
  }
}

module.exports = new GoogleAuthService();