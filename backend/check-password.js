const bcrypt = require('bcryptjs');

async function checkPassword() {
    const password = '5ji6gj94';
    const storedHash = '$2b$10$HneE4en3BJPt8cbqJAmtrOnTx7vcB6F4uMo0qHy3xFFlr0sbwc4ym';
    
    console.log('測試密碼:', password);
    console.log('儲存的雜湊:', storedHash);
    console.log('雜湊長度:', storedHash.length);
    
    const isMatch = await bcrypt.compare(password, storedHash);
    console.log('密碼比對結果:', isMatch);
    
    // 生成新的雜湊來比較
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(password, salt);
    console.log('新生成的雜湊:', newHash);
    console.log('新雜湊長度:', newHash.length);
    
    const isNewMatch = await bcrypt.compare(password, newHash);
    console.log('新雜湊比對結果:', isNewMatch);
}

checkPassword().catch(console.error);