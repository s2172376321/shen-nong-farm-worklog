const bcrypt = require('bcryptjs');

async function testPasswordHash() {
    const password = '5ji6gj94';
    
    // 生成新的雜湊
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log('Generated hash:', hash);
    console.log('Hash length:', hash.length);
    
    // 驗證密碼
    const isMatch = await bcrypt.compare(password, hash);
    console.log('Password verification:', isMatch);
    
    // 驗證當前資料庫中的雜湊
    const dbHash = '$2a$10$YYQaZVdfrBUVlU/3BKGKbOPOYlZEXS1fn8UZu8rQU1K1HQKvDPKVi';
    const isDbMatch = await bcrypt.compare(password, dbHash);
    console.log('Current DB hash verification:', isDbMatch);
}

testPasswordHash(); 