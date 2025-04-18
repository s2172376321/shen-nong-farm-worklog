const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

const AttachmentController = {
  // 上傳工單附件
  async uploadWorkLogAttachment(req, res) {
    try {
      if (!req.files || !req.files.attachment) {
        return res.status(400).json({ message: '沒有找到上傳的文件' });
      }

      const file = req.files.attachment;
      const workLogId = req.params.workLogId;
      const userId = req.user.id;

      // 檢查工單是否存在
      const workLogQuery = 'SELECT id FROM work_logs WHERE id = $1';
      const workLogResult = await db.query(workLogQuery, [workLogId]);
      
      if (workLogResult.rows.length === 0) {
        return res.status(404).json({ message: '工單不存在' });
      }

      // 創建上傳目錄（如果不存在）
      const uploadDir = path.join(UPLOAD_DIR, workLogId);
      await fs.mkdir(uploadDir, { recursive: true });

      // 生成唯一的文件名
      const fileExt = path.extname(file.name);
      const fileName = `${uuidv4()}${fileExt}`;
      const filePath = path.join(uploadDir, fileName);

      // 保存文件
      await fs.writeFile(filePath, file.data);

      // 在數據庫中記錄附件信息
      const query = `
        INSERT INTO work_log_attachments 
        (work_log_id, file_name, file_path, file_type, file_size, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const values = [
        workLogId,
        file.name,
        path.relative(UPLOAD_DIR, filePath),
        file.mimetype,
        file.size,
        userId
      ];

      const result = await db.query(query, values);

      res.json({
        message: '附件上傳成功',
        attachmentId: result.rows[0].id,
        fileName: file.name
      });
    } catch (error) {
      console.error('上傳附件失敗:', error);
      res.status(500).json({ message: '上傳附件失敗' });
    }
  },

  // 獲取工單附件列表
  async getWorkLogAttachments(req, res) {
    try {
      const workLogId = req.params.workLogId;

      const query = `
        SELECT 
          a.id,
          a.file_name,
          a.file_type,
          a.file_size,
          a.created_at,
          u.username as uploaded_by_name
        FROM work_log_attachments a
        JOIN users u ON a.uploaded_by = u.id
        WHERE a.work_log_id = $1
        ORDER BY a.created_at DESC
      `;

      const result = await db.query(query, [workLogId]);

      res.json(result.rows);
    } catch (error) {
      console.error('獲取附件列表失敗:', error);
      res.status(500).json({ message: '獲取附件列表失敗' });
    }
  },

  // 刪除工單附件
  async deleteWorkLogAttachment(req, res) {
    try {
      const attachmentId = req.params.attachmentId;
      const userId = req.user.id;

      // 獲取附件信息
      const query = `
        SELECT * FROM work_log_attachments 
        WHERE id = $1 AND (uploaded_by = $2 OR EXISTS (
          SELECT 1 FROM users WHERE id = $2 AND role = 'admin'
        ))
      `;

      const result = await db.query(query, [attachmentId, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: '附件不存在或無權限刪除' });
      }

      const attachment = result.rows[0];
      const filePath = path.join(UPLOAD_DIR, attachment.file_path);

      // 刪除文件
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error('刪除文件失敗:', error);
      }

      // 從數據庫中刪除記錄
      await db.query('DELETE FROM work_log_attachments WHERE id = $1', [attachmentId]);

      res.json({ message: '附件已刪除' });
    } catch (error) {
      console.error('刪除附件失敗:', error);
      res.status(500).json({ message: '刪除附件失敗' });
    }
  },

  // 下載工單附件
  async downloadWorkLogAttachment(req, res) {
    try {
      const attachmentId = req.params.attachmentId;

      // 獲取附件信息
      const query = 'SELECT * FROM work_log_attachments WHERE id = $1';
      const result = await db.query(query, [attachmentId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: '附件不存在' });
      }

      const attachment = result.rows[0];
      const filePath = path.join(UPLOAD_DIR, attachment.file_path);

      // 檢查文件是否存在
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({ message: '文件不存在' });
      }

      // 設置響應頭
      res.setHeader('Content-Type', attachment.file_type);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.file_name)}"`);

      // 發送文件
      res.sendFile(filePath);
    } catch (error) {
      console.error('下載附件失敗:', error);
      res.status(500).json({ message: '下載附件失敗' });
    }
  }
};

module.exports = AttachmentController; 