import React, { useState } from 'react';
import { Button, message, Upload, List, Space, Typography } from 'antd';
import { UploadOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { uploadAttachment, getAttachments, downloadAttachment, deleteAttachment } from '../utils/api';

const { Text } = Typography;

const AttachmentUpload = ({ workLogId }) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);

  // 獲取附件列表
  const fetchAttachments = async () => {
    try {
      const data = await getAttachments(workLogId);
      setAttachments(data);
    } catch (error) {
      message.error('獲取附件列表失敗');
    }
  };

  // 上傳附件
  const handleUpload = async (file) => {
    try {
      setLoading(true);
      await uploadAttachment(workLogId, file);
      message.success('附件上傳成功');
      fetchAttachments();
    } catch (error) {
      message.error('附件上傳失敗');
    } finally {
      setLoading(false);
    }
    return false; // 阻止默認上傳行為
  };

  // 下載附件
  const handleDownload = async (attachment) => {
    try {
      const response = await downloadAttachment(attachment._id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('附件下載失敗');
    }
  };

  // 刪除附件
  const handleDelete = async (attachment) => {
    try {
      await deleteAttachment(attachment._id);
      message.success('附件刪除成功');
      fetchAttachments();
    } catch (error) {
      message.error('附件刪除失敗');
    }
  };

  // 組件加載時獲取附件列表
  React.useEffect(() => {
    fetchAttachments();
  }, [workLogId]);

  return (
    <div>
      <Upload
        beforeUpload={handleUpload}
        showUploadList={false}
        disabled={loading}
      >
        <Button icon={<UploadOutlined />} loading={loading}>
          上傳附件
        </Button>
      </Upload>

      <List
        style={{ marginTop: 16 }}
        dataSource={attachments}
        renderItem={(attachment) => (
          <List.Item
            actions={[
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(attachment)}
              >
                下載
              </Button>,
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(attachment)}
              >
                刪除
              </Button>
            ]}
          >
            <List.Item.Meta
              title={attachment.filename}
              description={
                <Space>
                  <Text type="secondary">
                    大小: {(attachment.size / 1024).toFixed(2)} KB
                  </Text>
                  <Text type="secondary">
                    上傳時間: {new Date(attachment.uploadedAt).toLocaleString()}
                  </Text>
                  <Text type="secondary">
                    上傳者: {attachment.uploadedBy?.username}
                  </Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
};

export default AttachmentUpload; 