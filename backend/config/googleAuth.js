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
        // 這是 ID Token (JWT 格式) - 從 One Tap 獲得
        try {
          return await this._verifyIdToken(token);
        } catch (error) {
          console.error('ID Token 驗證失敗，嘗試其他方法:', error);
          // 如果直接驗證失敗，嘗試通過 tokeninfo 端點
          return await this._verifyIdTokenViaEndpoint(token);
        }
      } else {
        // 這可能是授權碼或訪問令牌
        return await this._exchangeCodeOrVerifyToken(token);
      }
    } catch (error) {
      console.error('Google Token 驗證失敗:', error);
      throw new Error('Google 登入驗證失敗: ' + error.message);
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

  // 通過 Google API 端點驗證 ID token
  async _verifyIdTokenViaEndpoint(idToken) {
    try {
      // 使用 Google tokeninfo 端點驗證
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      
      if (!response.ok) {
        throw new Error(`Token 驗證失敗: ${response.status}`);
      }

      const data = await response.json();
      
      // 驗證 aud (audience) 是否匹配我們的 client_id
      if (data.aud !== process.env.GOOGLE_CLIENT_ID) {
        throw new Error('Token audience 不匹配');
      }
      
      return {
        googleId: data.sub,
        email: data.email,
        username: data.name,
        profileImage: data.picture
      };
    } catch (error) {
      console.error('通過端點驗證ID Token失敗:', error);
      throw error;
    }
  }

  // 處理授權碼或直接驗證 access token
  async _exchangeCodeOrVerifyToken(token) {
    try {
      // 首先嘗試當作授權碼處理
      try {
        const { tokens } = await this.client.getToken(token);
        const accessToken = tokens.access_token;
        return await this._getUserInfoWithAccessToken(accessToken);
      } catch (codeError) {
        console.log('不是有效的授權碼，嘗試作為 access token 處理');
        // 如果不是授權碼，嘗試直接作為 access token 使用
        return await this._getUserInfoWithAccessToken(token);
      }
    } catch (error) {
      console.error('Token處理失敗:', error);
      throw error;
    }
  }

  // 使用 access token 獲取用戶資訊
  async _getUserInfoWithAccessToken(accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error(`獲取用戶資訊失敗: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      googleId: data.id,
      email: data.email,
      username: data.name,
      profileImage: data.picture
    };
  }
}

module.exports = new GoogleAuthService();