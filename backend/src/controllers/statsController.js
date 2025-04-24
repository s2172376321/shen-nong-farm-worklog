const db = require('../config/database');

const StatsController = {
  // 獲取系統統計資訊
  async getDashboardStats(req, res) {
    try {
      // 總使用者數
      const usersCountQuery = 'SELECT COUNT(*) as total_users FROM users';
      const usersCountResult = await db.query(usersCountQuery);

      // 待審核工作日誌數
      const pendingWorkLogsQuery = 'SELECT COUNT(*) as pending_work_logs FROM work_logs WHERE status = $1';
      const pendingWorkLogsResult = await db.query(pendingWorkLogsQuery, ['pending']);

      // 未讀公告數 - 修改為計算用戶未讀的
      const unreadNoticesQuery = `
        SELECT COUNT(*) as unread_notices 
        FROM notices n
        LEFT JOIN notice_reads nr ON n.id = nr.notice_id AND nr.user_id = $1
        WHERE nr.id IS NULL
        AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
      `;
      const unreadNoticesResult = await db.query(unreadNoticesQuery, [req.user.id]);

      res.json({
        totalUsers: usersCountResult.rows[0].total_users,
        pendingWorkLogs: pendingWorkLogsResult.rows[0].pending_work_logs,
        unreadNotices: unreadNoticesResult.rows[0].unread_notices
      });
    } catch (error) {
      console.error('獲取統計資訊失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  }
};

module.exports = StatsController; 