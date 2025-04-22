const { OAuth2Client } = require('google-auth-library');

// 創建 Google OAuth2 客戶端
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

module.exports = client; 