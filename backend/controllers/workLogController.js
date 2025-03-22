// 位置：backend/controllers/workLogController.js
const db = require('../config/database');

// 工作時數計算工具函數
function calculateWorkHours(startTime, endTime) {
  try {
    const startParts = startTime.split(':').map(Number);
    const endParts = endTime.split(':').map(Number);

    if (startParts.length !== 2 || endParts.length !== 2) {
      return { hours: 0, isValid: false };
    }

    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    
    if (startMinutes >= endMinutes) {
      return { hours: 0, isValid: false };
    }

    let workMinutes = endMinutes - startMinutes;
    
    // 排除午休時間 (12:00-13:00)
    const lunchStartMinutes = 12 * 60;
    const lunchEndMinutes = 13 * 60;
    
    if (startMinutes < lunchStartMinutes && endMinutes > lunchEndMinutes) {
      // 跨越整個午休時間
      workMinutes -= 60;
    } else if (startMinutes < lunchStartMinutes && endMinutes > lunchStartMinutes && endMinutes <= lunchEndMinutes) {
      // 結束時間在午休時間內
      workMinutes -= (endMinutes - lunchStartMinutes);
    } else if (startMinutes >= lunchStartMinutes && startMinutes < lunchEndMinutes && endMinutes > lunchEndMinutes) {
      // 開始時間在午休時間內
      workMinutes -= (lunchEndMinutes - startMinutes);
    } else if (startMinutes >= lunchStartMinutes && endMinutes <= lunchEndMinutes) {
      // 完全在午休時間內
      workMinutes = 0;
    }

    const workHours = workMinutes / 60;
    
    return {
      hours: parseFloat(workHours.toFixed(2)),
      isValid: workHours > 0
    };
  } catch (error) {
    console.error('工作時數計算錯誤:', error);
    return { hours: 0, isValid: false };
  }
}

const WorkLogController = {
  // 創建工作日誌
  async createWorkLog(req, res) {
    try {
      const userId = req.user.id;
      
      // 解構請求數據，使用一致的命名
      const { 
        location_code, position_code, position_name,
        work_category_code, work_category_name,
        start_time, end_time, details,
        crop, harvest_quantity = 0,
        product_id = '', product_name = '', product_quantity = 0
      } = req.body;

      // 基本驗證
      if (!start_time || !end_time) {
        return res.status(400).json({ 
          message: '開始和結束時間為必填欄位'
        });
      }

      // 位置驗證
      if (!position_code && !position_name) {
        return res.status(400).json({ 
          message: '位置為必填欄位'
        });
      }

      // 計算工作時數
      const { hours, isValid } = calculateWorkHours(start_time, end_time);
      
      if (!isValid) {
        return res.status(400).json({ 
          message: '工作時間無效',
          details: '請確保開始時間早於結束時間，且不在午休時間(12:00-13:00)內'
        });
      }

      // 構建 SQL 查詢
      const query = `
        INSERT INTO work_logs (
          user_id, location_code, position_code, position_name,
          work_category_code, work_category_name,
          start_time, end_time, work_hours, details,
          crop, harvest_quantity,
          product_id, product_name, product_quantity,
          status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
        RETURNING id
      `;

      const values = [
        userId,                        // $1
        location_code || '',           // $2
        position_code || '',           // $3
        position_name || '',           // $4
        work_category_code || '',      // $5
        work_category_name || '',      // $6
        start_time,                    // $7
        end_time,                      // $8
        hours,                         // $9
        details || '',                 // $10
        crop || '',                    // $11
        harvest_quantity || 0,         // $12
        product_id || '',              // $13
        product_name || '',            // $14
        product_quantity || 0,         // $15
        'pending'                      // $16
      ];

      // 執行查詢
      const result = await db.query(query, values);
      
      // 返回成功回應
      res.status(201).json({
        message: '工作日誌創建成功',
        workLogId: result.rows[0].id,
        workHours: hours
      });
    } catch (error) {
      console.error('創建工作日誌失敗:', error);
      
      // 根據錯誤類型返回適當的錯誤信息
      if (error.code === '23505') {
        return res.status(400).json({ message: '時間段重疊：該時間段已有工作日誌記錄' });
      }
      
      res.status(500).json({
        message: '伺服器錯誤，請稍後再試',
        error: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
  },

  // 搜索工作日誌
  async searchWorkLogs(req, res) {
    try {
      const userId = req.user.id;
      const { location, crop, startDate, endDate, status } = req.query;
      
      // 構建查詢
      let queryText = `
        SELECT wl.*, u.username
        FROM work_logs wl
        JOIN users u ON wl.user_id = u.id
        WHERE 1=1
      `;
      
      const queryParams = [];
      let paramIndex = 1;
      
      // 如果不是管理員，只能查看自己的日誌
      if (req.user.role !== 'admin') {
        queryText += ` AND wl.user_id = $${paramIndex}`;
        queryParams.push(userId);
        paramIndex++;
      }
      
      // 過濾條件
      if (location) {
        queryText += ` AND (wl.position_name ILIKE $${paramIndex} OR wl.location_code ILIKE $${paramIndex})`;
        queryParams.push(`%${location}%`);
        paramIndex++;
      }
      
      if (crop) {
        queryText += ` AND (wl.crop ILIKE $${paramIndex} OR wl.work_category_name ILIKE $${paramIndex})`;
        queryParams.push(`%${crop}%`);
        paramIndex++;
      }
      
      if (status) {
        queryText += ` AND wl.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }
      
      if (startDate && endDate) {
        queryText += ` AND DATE(wl.created_at) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        queryParams.push(startDate, endDate);
        paramIndex += 2;
      }
      
      // 排序
      queryText += ' ORDER BY wl.created_at DESC';
      
      // 限制返回數量
      queryText += ' LIMIT 100';
      
      // 執行查詢
      const result = await db.query(queryText, queryParams);
      
      // 標準化時間格式
      const formattedResults = result.rows.map(log => ({
        ...log,
        start_time: log.start_time ? log.start_time.substring(0, 5) : log.start_time,
        end_time: log.end_time ? log.end_time.substring(0, 5) : log.end_time
      }));
      
      res.json(formattedResults);
    } catch (error) {
      console.error('搜索工作日誌失敗:', error);
      res.status(500).json({
        message: '伺服器錯誤，請稍後再試',
        error: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
  },

  // 獲取今日工時
  async getTodayHour(req, res) {
    try {
      const userId = req.user.id;
      const today = new Date().toISOString().split('T')[0];
      
      // 查詢今日總工時
      const query = `
        SELECT COALESCE(SUM(work_hours), 0) as total_hours
        FROM work_logs
        WHERE user_id = $1
        AND DATE(created_at) = $2
      `;
      
      const result = await db.query(query, [userId, today]);
      const totalHours = parseFloat(result.rows[0].total_hours);
      
      // 計算完成狀態
      const remainingHours = Math.max(0, 8 - totalHours);
      const isComplete = totalHours >= 8;
      
      res.json({
        total_hours: totalHours.toFixed(2),
        remaining_hours: remainingHours.toFixed(2),
        is_complete: isComplete
      });
    } catch (error) {
      console.error('獲取今日工時失敗:', error);
      res.status(500).json({
        message: '伺服器錯誤，請稍後再試',
        error: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
  },

  // 審核工作日誌 (管理員功能)
  async reviewWorkLog(req, res) {
    try {
      const { workLogId } = req.params;
      const { status } = req.body;
      const reviewerId = req.user.id;
      
      // 驗證狀態值
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ 
          message: '無效的狀態值',
          validValues: ['approved', 'rejected', 'pending']
        });
      }
      
      // 更新工作日誌狀態
      const query = `
        UPDATE work_logs
        SET status = $1, reviewer_id = $2, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, status
      `;
      
      const result = await db.query(query, [status, reviewerId, workLogId]);
      
      // 檢查是否找到記錄
      if (result.rows.length === 0) {
        return res.status(404).json({ message: '找不到指定的工作日誌' });
      }
      
      res.json({
        message: '工作日誌審核成功',
        workLogId: result.rows[0].id,
        status: result.rows[0].status
      });
    } catch (error) {
      console.error('審核工作日誌失敗:', error);
      res.status(500).json({
        message: '伺服器錯誤，請稍後再試',
        error: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
  },

  // 獲取位置的作物列表
  async getLocationCrops(req, res) {
    const { positionCode } = req.params;
    
    try {
      console.log(`獲取位置 ${positionCode} 的作物列表`);
      
      // 查詢指定位置曾種植的作物
      const query = `
        SELECT DISTINCT crop 
        FROM work_logs 
        WHERE position_code = $1 
          AND work_category_name = '種植' 
        ORDER BY crop
      `;
      
      const result = await db.query(query, [positionCode]);
      
      console.log(`找到 ${result.rows.length} 種作物`);
      
      // 抽取作物名稱列表
      const crops = result.rows.map(row => row.crop).filter(Boolean); // 過濾掉空值
      
      res.json(crops);
    } catch (error) {
      console.error('獲取位置作物列表失敗:', error);
      res.status(500).json({ message: '獲取位置作物列表失敗，請稍後再試' });
    }
  },
  
  // 獲取工作日誌統計
  async getWorkLogStats(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      // 構建查詢參數
      const queryParams = [userId];
      let dateFilter = '';
      
      if (startDate && endDate) {
        dateFilter = 'AND DATE(created_at) BETWEEN $2 AND $3';
        queryParams.push(startDate, endDate);
      }
      
      // 獲取總工作日誌數和總工時
      const statsQuery = `
        SELECT 
          COUNT(*) as total_logs,
          COALESCE(SUM(work_hours), 0) as total_hours
        FROM work_logs
        WHERE user_id = $1 ${dateFilter}
      `;
      
      const statsResult = await db.query(statsQuery, queryParams);
      
      // 獲取工作類別分布
      const categoryQuery = `
        SELECT 
          work_category_name,
          COUNT(*) as log_count,
          COALESCE(SUM(work_hours), 0) as category_hours
        FROM work_logs
        WHERE user_id = $1 ${dateFilter}
        GROUP BY work_category_name
        ORDER BY category_hours DESC
        LIMIT 5
      `;
      
      const categoryResult = await db.query(categoryQuery, queryParams);
      
      // 統計每日平均工時
      let avgHoursPerDay = 0;
      
      if (startDate && endDate) {
        // 計算日期範圍內的天數
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
        avgHoursPerDay = statsResult.rows[0].total_hours / days;
      }
      
      res.json({
        totalWorkLogs: parseInt(statsResult.rows[0].total_logs),
        totalHours: parseFloat(statsResult.rows[0].total_hours).toFixed(2),
        avgHoursPerDay: parseFloat(avgHoursPerDay).toFixed(2),
        topCategories: categoryResult.rows.map(row => ({
          name: row.work_category_name,
          logCount: parseInt(row.log_count),
          hours: parseFloat(row.category_hours).toFixed(2)
        }))
      });
    } catch (error) {
      console.error('獲取工作日誌統計失敗:', error);
      res.status(500).json({
        message: '伺服器錯誤，請稍後再試',
        error: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
  },

  // 匯出工作日誌
  async exportWorkLogs(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      // 構建查詢
      let query = `
        SELECT 
          wl.id, 
          wl.created_at, 
          wl.position_name, 
          wl.work_category_name,
          wl.crop,
          wl.start_time, 
          wl.end_time, 
          wl.work_hours,
          wl.harvest_quantity,
          wl.details,
          wl.status,
          u.username
        FROM work_logs wl
        JOIN users u ON wl.user_id = u.id
        WHERE 1=1
      `;
      
      const queryParams = [];
      let paramIndex = 1;
      
      // 如果不是管理員，只能匯出自己的日誌
      if (req.user.role !== 'admin') {
        query += ` AND wl.user_id = ${paramIndex}`;
        queryParams.push(userId);
        paramIndex++;
      }
      
      // 日期過濾
      if (startDate && endDate) {
        query += ` AND DATE(wl.created_at) BETWEEN ${paramIndex} AND ${paramIndex + 1}`;
        queryParams.push(startDate, endDate);
        paramIndex += 2;
      }
      
      // 排序
      query += ' ORDER BY wl.created_at DESC';
      
      // 執行查詢
      const result = await db.query(query, queryParams);
      
      // 格式化 CSV 表頭
      const headers = [
        '日期', '位置', '工作類別', '作物', '開始時間', '結束時間', 
        '工作時數', '採收重量', '備註', '狀態', '使用者'
      ];
      
      // 格式化 CSV 數據
      const csvRows = result.rows.map(log => [
        new Date(log.created_at).toLocaleDateString(),
        log.position_name,
        log.work_category_name,
        log.crop,
        log.start_time,
        log.end_time,
        log.work_hours,
        log.harvest_quantity,
        log.details,
        log.status === 'approved' ? '已核准' : log.status === 'rejected' ? '已拒絕' : '審核中',
        log.username
      ]);
      
      // 合併表頭和數據
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.map(cell => 
          typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell
        ).join(','))
      ].join('\n');
      
      // 設置 HTTP 標頭
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=work_logs.csv');
      
      // 發送 CSV 內容
      res.send(csvContent);
    } catch (error) {
      console.error('匯出工作日誌失敗:', error);
      res.status(500).json({
        message: '伺服器錯誤，請稍後再試',
        error: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
  }
};