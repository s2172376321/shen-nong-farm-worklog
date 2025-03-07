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
  async verifyToken(token) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      return {
        googleId: payload['sub'],
        email: payload['email'],
        username: payload['name'],
        profileImage: payload['picture']
      };
    } catch (error) {
      console.error('Google Token 驗證失敗:', error);
      throw new Error('Google 登入驗證失敗');
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