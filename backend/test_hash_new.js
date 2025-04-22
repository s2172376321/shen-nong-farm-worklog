const bcrypt = require('bcryptjs');

async function testPasswordHash() {
    const password = '5ji6gj94';
    
    // 生成新的雜湊
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log('New hash:', hash);
    
    // 驗證新雜湊
    const isMatch = await bcrypt.compare(password, hash);
    console.log('New hash verification:', isMatch);
    
    // 驗證當前資料庫中的雜湊
    const dbHash = '$2a$10$3IAfxI7ekmnHqMv1/I8.4OQxDLWHHG.tzoNWBHPmo/Gc.MwE9CvbG';
    const isDbMatch = await bcrypt.compare(password, dbHash);
    console.log('Current DB hash verification:', isDbMatch);
    
    // 生成一個新的雜湊用於更新資料庫
    const newSalt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(password, newSalt);
    console.log('Generated new hash for DB:', newHash);
    
    // 驗證新生成的雜湊
    const isNewHashValid = await bcrypt.compare(password, newHash);
    console.log('New hash validation:', isNewHashValid);
}

testPasswordHash(); 