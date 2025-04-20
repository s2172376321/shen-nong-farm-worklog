// 使用內存存儲附件信息
const attachments = new Map();

class Attachment {
  constructor(data) {
    this.id = data.id || Date.now().toString();
    this.workLogId = data.workLogId;
    this.filename = data.filename;
    this.path = data.path;
    this.size = data.size;
    this.mimetype = data.mimetype;
    this.uploadedBy = data.uploadedBy;
    this.uploadedAt = data.uploadedAt || new Date();
  }

  // 保存附件信息
  save() {
    attachments.set(this.id, this);
    return this;
  }

  // 根據 ID 查找附件
  static findById(id) {
    return attachments.get(id);
  }

  // 根據工單 ID 查找附件列表
  static findByWorkLogId(workLogId) {
    return Array.from(attachments.values())
      .filter(attachment => attachment.workLogId === workLogId);
  }

  // 刪除附件
  static deleteById(id) {
    return attachments.delete(id);
  }
}

module.exports = Attachment; 