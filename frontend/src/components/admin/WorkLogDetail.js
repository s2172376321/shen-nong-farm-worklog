import AttachmentUpload from '../AttachmentUpload';

const WorkLogDetail = ({ workLog, onUpdate }) => {
  return (
    <div>
      <Card title="附件" style={{ marginTop: 16 }}>
        <AttachmentUpload workLogId={workLog._id} />
      </Card>
    </div>
  );
};

export default WorkLogDetail; 