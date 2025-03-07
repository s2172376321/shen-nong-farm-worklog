const db = require('../config/database');

const NoticeController = {
  // 創建公告
  async createNotice(req, res) {
    const { title, content, expiresAt } = req.body;
    const authorId = req.user.id;

    try {
      const query = `
        INSERT INTO notices 
        (title, content, author_id, expires_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;

      const values = [
        title, 
        content, 
        authorId, 
        expiresAt || null
      ];

      const result = await db.query(query, values);

      res.status(201).json({
        message: '公告創建成功',
        noticeId: result.rows[0].id
      });
    } catch (error) {
      console.error('創建公告失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 取得所有有效公告
  async getAllNotices(req, res) {
    try {
      const query = `
        SELECT n.*, u.username as author_name
        FROM notices n
        JOIN users u ON n.author_id = u.id
        WHERE (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ORDER BY created_at DESC
      `;

      const result = await db.query(query);

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
  }
};

module.exports = NoticeController;