const db = require('../config/database');
const path = require('path');
const fs = require('fs');
const { createLog } = require('../utils/logger');

// 確保上傳目錄存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const AttachmentController = {
    // 上傳附件
    async uploadAttachment(req, res) {
        try {
            if (!req.files || !req.files.file) {
                return res.status(400).json({ message: '沒有上傳檔案' });
            }

            const file = req.files.file;
            const fileName = `${Date.now()}-${file.name}`;
            const filePath = path.join(uploadDir, fileName);

            // 移動檔案到上傳目錄
            await file.mv(filePath);

            // 儲存檔案資訊到資料庫
            const query = `
                INSERT INTO attachments (original_name, file_name, file_path, file_size, mime_type, uploaded_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, original_name, file_name, file_size, mime_type, created_at
            `;

            const values = [
                file.name,
                fileName,
                filePath,
                file.size,
                file.mimetype,
                req.user.id
            ];

            const result = await db.query(query, values);
            createLog('info', `上傳附件: ${file.name}`);
            res.status(201).json(result.rows[0]);
        } catch (error) {
            createLog('error', `上傳附件失敗: ${error.message}`);
            res.status(500).json({ message: '上傳附件失敗' });
        }
    },

    // 下載附件
    async downloadAttachment(req, res) {
        try {
            const { id } = req.params;

            // 從資料庫獲取檔案資訊
            const query = 'SELECT * FROM attachments WHERE id = $1';
            const result = await db.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: '附件不存在' });
            }

            const attachment = result.rows[0];
            const filePath = attachment.file_path;

            // 檢查檔案是否存在
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ message: '檔案不存在' });
            }

            // 設定下載標頭
            res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_name}"`);
            res.setHeader('Content-Type', attachment.mime_type);
            res.setHeader('Content-Length', attachment.file_size);

            // 發送檔案
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

            createLog('info', `下載附件: ${attachment.original_name}`);
        } catch (error) {
            createLog('error', `下載附件失敗: ${error.message}`);
            res.status(500).json({ message: '下載附件失敗' });
        }
    },

    // 刪除附件
    async deleteAttachment(req, res) {
        try {
            const { id } = req.params;

            // 從資料庫獲取檔案資訊
            const query = 'SELECT * FROM attachments WHERE id = $1';
            const result = await db.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: '附件不存在' });
            }

            const attachment = result.rows[0];
            const filePath = attachment.file_path;

            // 刪除檔案
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // 從資料庫刪除記錄
            const deleteQuery = 'DELETE FROM attachments WHERE id = $1 RETURNING id';
            await db.query(deleteQuery, [id]);

            createLog('info', `刪除附件: ${attachment.original_name}`);
            res.json({ message: '附件刪除成功' });
        } catch (error) {
            createLog('error', `刪除附件失敗: ${error.message}`);
            res.status(500).json({ message: '刪除附件失敗' });
        }
    },

    // 獲取附件列表
    async getAttachments(req, res) {
        try {
            const query = `
                SELECT a.*, u.name as uploaded_by_name
                FROM attachments a
                JOIN users u ON a.uploaded_by = u.id
                ORDER BY a.created_at DESC
            `;

            const result = await db.query(query);
            res.json(result.rows);
        } catch (error) {
            createLog('error', `獲取附件列表失敗: ${error.message}`);
            res.status(500).json({ message: '獲取附件列表失敗' });
        }
    }
};

module.exports = AttachmentController; 