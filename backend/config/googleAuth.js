// 位置：backend/config/googleAuth.js
const { OAuth2Client } = require('google-auth-library');

class GoogleAuthService {
  constructor() {
    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // 驗證 Google ID Token
  async verifyToken(token, nonce) {
    try {
      console.log('開始驗證 Google ID Token');
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
        // 如果提供了 nonce，則驗證它
        ...(nonce && { nonce })
      });

      const payload = ticket.getPayload();
      console.log('Token 驗證成功，獲取用戶資料:', {
        email: payload['email'],
        name: payload['name']
      });
      
      // 驗證 nonce（如果提供）
      if (nonce && payload['nonce'] !== nonce) {
        throw new Error('無效的 nonce');
      }
      
      return {
        googleId: payload['sub'],
        email: payload['email'],
        username: payload['name'],
        name: payload['name'],
        profileImage: payload['picture']
      };
    } catch (error) {
      console.error('Google Token 驗證失敗:', error);
      throw new Error('Google 登入驗證失敗');
    }
  }

  // 使用授權碼獲取用戶資訊
  async getUserInfo(code) {
    try {
      console.log('使用授權碼獲取用戶資料');
      
      // 交換授權碼獲取 access token
      const { tokens } = await this.client.getToken(code);
      const idToken = tokens.id_token;
      
      // 使用 ID token 獲取用戶資訊
      return await this.verifyToken(idToken);
    } catch (error) {
      console.error('獲取 Google 用戶資訊失敗:', error);
      throw new Error('無法獲取 Google 用戶資訊');
    }
  }

  // 產生 Google 登入 URL
  generateAuthUrl(state, nonce) {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
      nonce
    });
  }
}

module.exports = new GoogleAuthService();