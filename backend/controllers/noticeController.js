// 位置：backend/controllers/noticeController.js
const db = require('../config/database');

const NoticeController = {
// 創建公告
async createNotice(req, res) {
  console.log('收到創建公告請求:', req.body);
  
  if (!req.body) {
    console.error('沒有收到請求內容');
    return res.status(400).json({ message: '請求內容為空' });
  }
  
  if (!req.body.title || !req.body.content) {
    console.error('缺少必填字段:', req.body);
    return res.status(400).json({ message: '標題和內容為必填項' });
  }
  
  const { title, content, expiresAt } = req.body;
  const authorId = req.user.id;

  try {
    const query = `
      INSERT INTO notices 
      (title, content, author_id, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, content, author_id, expires_at, created_at
    `;

    const values = [
      title, 
      content, 
      authorId, 
      expiresAt || null
    ];

    const result = await db.query(query, values);
    
    console.log('公告創建成功:', result.rows[0]);
    
    // 返回完整的公告對象，包括更多字段
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('創建公告失敗:', error);
    res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
  }
},





  // 取得所有有效公告（添加已讀狀態）
  async getAllNotices(req, res) {
    const userId = req.user.id;
    
    try {
      const query = `
        SELECT n.*, u.username as author_name,
          CASE WHEN nr.id IS NULL THEN false ELSE true END as is_read
        FROM notices n
        JOIN users u ON n.author_id::uuid = u.id::uuid
        LEFT JOIN notice_reads nr ON n.id::uuid = nr.notice_id::uuid AND nr.user_id::uuid = $1::uuid
        WHERE (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
        ORDER BY n.created_at DESC
      `;

      const result = await db.query(query, [userId]);

      res.json(result.rows);
    } catch (error) {
      console.error('取得公告失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 更新公告
  async updateNotice(req, res) {
    const { noticeId } = req.params;
    const { title, content, expiresAt } = req.body;
    const authorId = req.user.id;

    try {
      const query = `
        UPDATE notices 
        SET title = $1, 
            content = $2, 
            expires_at = $3
        WHERE id = $4 AND author_id = $5
        RETURNING id
      `;

      const values = [
        title, 
        content, 
        expiresAt || null, 
        noticeId, 
        authorId
      ];

      const result = await db.query(query, values);

      if (result.rowCount === 0) {
        return res.status(404).json({ message: '公告不存在或無權修改' });
      }

      res.json({
        message: '公告更新成功',
        noticeId: result.rows[0].id
      });
    } catch (error) {
      console.error('更新公告失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 刪除公告
  async deleteNotice(req, res) {
    const { noticeId } = req.params;
    const authorId = req.user.id;

    try {
      const query = `
        DELETE FROM notices 
        WHERE id = $1 AND author_id = $2
        RETURNING id
      `;

      const values = [noticeId, authorId];

      const result = await db.query(query, values);

      if (result.rowCount === 0) {
        return res.status(404).json({ message: '公告不存在或無權刪除' });
      }

      res.json({
        message: '公告刪除成功',
        noticeId: result.rows[0].id
      });
    } catch (error) {
      console.error('刪除公告失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 標記公告為已讀
  async markAsRead(req, res) {
    const { noticeId } = req.params;
    const userId = req.user.id;
    
    try {
      // 確認公告存在
      const noticeQuery = 'SELECT id FROM notices WHERE id = $1';
      const noticeResult = await db.query(noticeQuery, [noticeId]);

      if (noticeResult.rows.length === 0) {
        return res.status(404).json({ message: '公告不存在' });
      }

      // 插入或忽略（如果已存在）
      const query = `
        INSERT INTO notice_reads (user_id, notice_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, notice_id) DO NOTHING
        RETURNING id
      `;

      await db.query(query, [userId, noticeId]);

      res.json({ message: '公告已標記為已讀' });
    } catch (error) {
      console.error('標記公告已讀失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 獲取未讀公告數量
  async getUnreadCount(req, res) {
    const userId = req.user.id;
    
    try {
      const query = `
        SELECT COUNT(*) as unread_count
        FROM notices n
        LEFT JOIN notice_reads nr ON n.id::uuid = nr.notice_id::uuid AND nr.user_id::uuid = $1::uuid
        WHERE nr.id IS NULL
        AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
      `;

      const result = await db.query(query, [userId]);

      res.json({
        unreadCount: parseInt(result.rows[0].unread_count, 10)
      });
    } catch (error) {
      console.error('取得未讀公告數量失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 獲取未讀公告
  async getUnreadNotices(req, res) {
    const userId = req.user.id;
    
    try {
      const query = `
        SELECT n.*, u.username as author_name
        FROM notices n
        JOIN users u ON n.author_id::uuid = u.id::uuid
        LEFT JOIN notice_reads nr ON n.id::uuid = nr.notice_id::uuid AND nr.user_id::uuid = $1::uuid
        WHERE nr.id IS NULL
        AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
        ORDER BY n.created_at DESC
      `;

      const result = await db.query(query, [userId]);

      res.json(result.rows);
    } catch (error) {
      console.error('取得未讀公告失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  }
};

module.exports = NoticeController;