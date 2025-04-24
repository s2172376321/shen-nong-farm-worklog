const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// 資料庫配置
const pool = new Pool({
  user: 'postgres',           // 預設用戶名
  host: 'localhost',          // 預設主機
  database: 'shen_nong_farm', // 資料庫名稱
  password: '1qazXSW@',       // 正確的密碼
  port: 5432,                 // 預設端口
});

async function resetPassword() {
    const username = '1224';
    const newPassword = '5ji6gj94';
    
    console.log('開始重置密碼流程...');
    console.log('資料庫配置:', {
        user: pool.options.user,
        host: pool.options.host,
        database: pool.options.database,
        port: pool.options.port
    });
    
    try {
        // 生成新的密碼雜湊
        console.log('正在生成密碼雜湊...');
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);
        
        console.log('密碼重置資訊:');
        console.log('- 用戶名:', username);
        console.log('- 新密碼:', newPassword);
        console.log('- 新雜湊:', newHash);
        
        // 更新資料庫
        console.log('正在更新資料庫...');
        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING username',
            [newHash, username]
        );
        
        if (result.rowCount === 1) {
            console.log('密碼重置成功！');
            console.log('受影響的用戶:', result.rows[0].username);
        } else {
            console.log('警告：找不到用戶:', username);
        }
    } catch (error) {
        console.error('重置密碼時發生錯誤:');
        console.error('- 錯誤訊息:', error.message);
        console.error('- 錯誤堆疊:', error.stack);
        
        if (error.code === '28P01') {
            console.error('錯誤：資料庫認證失敗，請檢查用戶名和密碼');
        } else if (error.code === '3D000') {
            console.error('錯誤：資料庫不存在，請檢查資料庫名稱');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('錯誤：無法連接到資料庫，請檢查資料庫是否運行');
        }
    } finally {
        console.log('正在關閉資料庫連接...');
        await pool.end();
        console.log('資料庫連接已關閉');
    }
}

// 執行重置密碼
console.log('啟動密碼重置程序...');
resetPassword().then(() => {
    console.log('密碼重置程序完成');
}).catch(error => {
    console.error('程序執行失敗:', error);
}); 