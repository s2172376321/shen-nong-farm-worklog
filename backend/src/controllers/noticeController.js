const db = require('../config/database');
const { createLog } = require('../utils/logger');

const NoticeController = {
  // 創建公告
  async createNotice(req, res) {
    try {
      const { title, content, priority } = req.body;
      const authorId = req.user.id;

      const query = `
        INSERT INTO notices (title, content, author_id, priority)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, content, author_id, priority, created_at
      `;

      const values = [title, content, authorId, priority || 'medium'];
      const result = await db.query(query, values);

      createLog('info', `創建新公告: ${title}`);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      createLog('error', `創建公告失敗: ${error.message}`);
      res.status(500).json({ message: '創建公告失敗' });
    }
  },

  // 獲取所有公告
  async getAllNotices(req, res) {
    try {
      const query = `
        SELECT n.*, 
               CASE WHEN nr.id IS NULL THEN false ELSE true END as is_read
        FROM notices n
        LEFT JOIN notice_reads nr ON n.id = nr.notice_id AND nr.user_id = $1
        ORDER BY n.created_at DESC
      `;
      
      const result = await db.query(query, [req.user.id]);
      res.json(result.rows);
    } catch (error) {
      createLog('error', `獲取公告列表失敗: ${error.message}`);
      res.status(500).json({ message: '獲取公告列表失敗' });
    }
  },

  // 更新公告
  async updateNotice(req, res) {
    try {
      const { id } = req.params;
      const { title, content, priority, status } = req.body;
      const authorId = req.user.id;

      const query = `
        UPDATE notices 
        SET title = $1, 
            content = $2, 
            priority = $3,
            status = $4
        WHERE id = $5 AND author_id = $6
        RETURNING id, title, content, priority, status, updated_at
      `;

      const values = [title, content, priority, status, id, authorId];
      const result = await db.query(query, values);

      if (result.rowCount === 0) {
        return res.status(404).json({ message: '公告不存在或無權修改' });
      }

      createLog('info', `更新公告: ${title}`);
      res.json(result.rows[0]);
    } catch (error) {
      createLog('error', `更新公告失敗: ${error.message}`);
      res.status(500).json({ message: '更新公告失敗' });
    }
  },

  // 刪除公告
  async deleteNotice(req, res) {
    try {
      const { id } = req.params;
      const authorId = req.user.id;

      const query = `
        DELETE FROM notices 
        WHERE id = $1 AND author_id = $2
        RETURNING id, title
      `;

      const result = await db.query(query, [id, authorId]);

      if (result.rowCount === 0) {
        return res.status(404).json({ message: '公告不存在或無權刪除' });
      }

      createLog('info', `刪除公告: ${result.rows[0].title}`);
      res.json({ message: '公告刪除成功' });
    } catch (error) {
      createLog('error', `刪除公告失敗: ${error.message}`);
      res.status(500).json({ message: '刪除公告失敗' });
    }
  },

  // 標記為已讀
  async markAsRead(req, res) {
    try {
      const { noticeId } = req.params;
      
      const query = `
        INSERT INTO notice_reads (notice_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (notice_id, user_id) DO NOTHING
      `;
      
      await db.query(query, [noticeId, req.user.id]);
      res.json({ message: '已標記為已讀' });
    } catch (error) {
      createLog('error', `標記公告為已讀失敗: ${error.message}`);
      res.status(500).json({ message: '標記公告為已讀失敗' });
    }
  },

  // 獲取未讀公告數量
  async getUnreadCount(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: '未授權' });
      }

      const query = `
        SELECT COUNT(*) 
        FROM notices n
        LEFT JOIN notice_reads nr ON n.id = nr.notice_id AND nr.user_id = $1
        WHERE nr.id IS NULL
      `;
      
      const result = await db.query(query, [req.user.id]);
      const unreadCount = parseInt(result.rows[0].count);

      res.json({ unreadCount });
    } catch (error) {
      createLog('error', `獲取未讀公告數量失敗: ${error.message}`);
      res.status(500).json({ message: '獲取未讀公告數量失敗' });
    }
  },

  // 獲取未讀公告
  async getUnreadNotices(req, res) {
    try {
      const query = `
        SELECT n.*
        FROM notices n
        LEFT JOIN notice_reads nr ON n.id = nr.notice_id AND nr.user_id = $1
        WHERE nr.id IS NULL
        ORDER BY n.created_at DESC
      `;
      
      const result = await db.query(query, [req.user.id]);
      res.json(result.rows);
    } catch (error) {
      createLog('error', `獲取未讀公告失敗: ${error.message}`);
      res.status(500).json({ message: '獲取未讀公告失敗' });
    }
  },
};

module.exports = NoticeController;