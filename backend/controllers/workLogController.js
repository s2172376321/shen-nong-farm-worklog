// 位置：backend/controllers/workLogController.js
const db = require('../config/database');
const csvUtils = require('../utils/csvUtils');

// 查詢今日工作時數 - 修正LENGTH函數問題
async function queryTodayWorkHours(userId, isAdmin) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayStr = today.toISOString();
  const tomorrowStr = tomorrow.toISOString();

  let query = `
    SELECT 
      SUM(
        CASE 
          WHEN 
            start_time IS NOT NULL AND 
            end_time IS NOT NULL 
          THEN 
            (
              (CAST(SUBSTRING(end_time::text FROM 1 FOR 2) AS INTEGER) - 
               CAST(SUBSTRING(start_time::text FROM 1 FOR 2) AS INTEGER)) +
              (CAST(SUBSTRING(end_time::text FROM 4 FOR 2) AS NUMERIC) - 
               CAST(SUBSTRING(start_time::text FROM 4 FOR 2) AS NUMERIC)) / 60.0
            )
          ELSE 0 
        END
      ) as total_hours
    FROM work_logs
    WHERE 
      created_at >= $1 AND 
      created_at < $2 AND
      start_time IS NOT NULL AND 
      end_time IS NOT NULL
  `;

  const values = [todayStr, tomorrowStr];

  if (!isAdmin) {
    query += ` AND user_id = $3`;
    values.push(userId);
  }

  const result = await db.query(query, values);
  const totalHours = result.rows.length > 0 ? 
    Math.min(parseFloat(result.rows[0].total_hours || 0), 8).toFixed(2) : 
    '0.00';

  return totalHours;
}

const WorkLogController = {
  // 創建工作日誌
  async createWorkLog(req, res) {
    try {
      // 記錄接收到的完整請求數據，方便調試
      console.log('接收到工作日誌提交請求:', JSON.stringify(req.body, null, 2));
      
      // 驗證請求數據是否包含必要欄位
      const { 
        location, 
        crop, 
        startTime, 
        endTime,
        start_time,
        end_time,
        work_categories,
        workCategories, 
        details, 
        harvestQuantity,
        harvest_quantity,
        position_code,
        position_name,
        work_category_code,
        work_category_name
      } = req.body;
  
      // 使用實際提供的欄位或其替代欄位
      const effectiveStartTime = startTime || start_time;
      const effectiveEndTime = endTime || end_time;
      const effectiveHarvestQuantity = harvestQuantity || harvest_quantity || 0;
      const effectiveWorkCategories = workCategories || work_categories || [];
      
      // 檢查必填字段
      if (!effectiveStartTime || !effectiveEndTime) {
        return res.status(400).json({ 
          message: '缺少必填欄位',
          details: '開始時間和結束時間為必填項'
        });
      }
  
      // 檢查位置和作物是否至少有一個有效值
      if ((!location && !position_name) || (!crop && !work_category_name)) {
        return res.status(400).json({ 
          message: '缺少必填欄位',
          details: '位置和作物/工作類別為必填項'
        });
      }
  
      // 時間格式驗證
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(effectiveStartTime) || !timeRegex.test(effectiveEndTime)) {
        return res.status(400).json({ 
          message: '時間格式不正確',
          details: '時間必須為 HH:MM 格式'
        });
      }
  
      console.log('插入資料庫的欄位值:', {
        user_id: req.user.id,
        location: location || position_name,
        crop: crop || work_category_name,
        start_time: effectiveStartTime,
        end_time: effectiveEndTime,
        position_code,
        position_name,
        work_category_code,
        work_category_name
      });
  
      // 使用更寬容的SQL查詢，接受多種可能的欄位組合
      const query = `
        INSERT INTO work_logs 
        (user_id, location, crop, start_time, end_time, work_categories, details, harvest_quantity,
         location_code, position_code, position_name, work_category_code, work_category_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `;
  
      const values = [
        req.user.id,
        location || position_name || '', // 使用 position_name 作為 location 的備選
        crop || work_category_name || '', // 使用 work_category_name 作為 crop 的備選
        effectiveStartTime,
        effectiveEndTime,
        effectiveWorkCategories,
        details || '',
        effectiveHarvestQuantity,
        req.body.location_code || '',
        position_code || '',
        position_name || '',
        work_category_code || '',
        work_category_name || ''
      ];
  
      // 嘗試插入資料庫
      console.log('執行SQL查詢...');
      const result = await db.query(query, values);
      console.log('SQL查詢成功，返回ID:', result.rows[0].id);
      
      // 成功回應
      res.status(201).json({
        message: '工作日誌創建成功',
        workLogId: result.rows[0].id,
        status: 'success'
      });
    } catch (error) {
      // 詳細記錄錯誤
      console.error('創建工作日誌失敗:', {
        error: error.message,
        stack: error.stack,
        query: error.query
      });
      
      // 檢查常見數據庫錯誤類型並提供友好訊息
      let errorMessage = '伺服器錯誤，請稍後再試';
      let statusCode = 500;
      
      if (error.code === '23505') {
        errorMessage = '重複提交工作日誌';
        statusCode = 400;
      } else if (error.code === '23503') {
        errorMessage = '參考的外鍵不存在';
        statusCode = 400;
      } else if (error.code === '22P02') {
        errorMessage = '數據類型錯誤';
        statusCode = 400;
      } else if (error.code === '42P01') {
        errorMessage = '資料表不存在，請聯繫管理員';
        statusCode = 500;
      } else if (error.code === '42703') {
        errorMessage = '欄位不存在，可能需要更新資料庫結構';
        statusCode = 500;
      }
      
      res.status(statusCode).json({ 
        message: errorMessage,
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
        status: 'error'
      });
    }
  },


// 獲取特定位置的作物列表
async getLocationCrops(req, res) {
  const { positionCode } = req.params;
  
  try {
    // 查詢工作類別為"種植"的工作日誌，找出該位置的所有作物
    const query = `
      SELECT DISTINCT crop 
      FROM work_logs 
      WHERE position_code = $1 
      AND work_category_name = '種植' 
      ORDER BY crop
    `;
    
    const result = await db.query(query, [positionCode]);
    
    res.json(result.rows.map(row => row.crop));
  } catch (error) {
    console.error('獲取位置作物列表失敗:', error);
    res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
  }
},





// 查詢工作日誌 - 修改版
async searchWorkLogs(req, res) {
  const { location, crop, startDate, endDate, status } = req.query;

  try {
    let query = `
      SELECT wl.*, u.username
      FROM work_logs wl
      JOIN users u ON wl.user_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    // 如果是使用者查詢，只顯示自己的工作日誌
    if (!req.user.role || req.user.role !== 'admin') {
      query += ` AND wl.user_id = $${paramIndex}`;
      values.push(req.user.id);
      paramIndex++;
    }

    if (location) {
      query += ` AND wl.location ILIKE $${paramIndex}`;
      values.push(`%${location}%`);
      paramIndex++;
    }

    if (crop) {
      query += ` AND wl.crop ILIKE $${paramIndex}`;
      values.push(`%${crop}%`);
      paramIndex++;
    }

    // 添加狀態過濾
    if (status) {
      query += ` AND wl.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (startDate && endDate) {
      query += ` AND wl.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      values.push(startDate, endDate);
      paramIndex += 2;
    }

    query += ' ORDER BY wl.created_at DESC';

    const result = await db.query(query, values);
    
    res.json(result.rows);
  } catch (error) {
    console.error('查詢工作日誌失敗:', error);
    res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
  }
},

  async uploadCSV(req, res) {
    try {
      // 檢查是否有文件上傳
      if (!req.files || !req.files.csvFile) {
        return res.status(400).json({ 
          message: '沒有找到CSV文件' 
        });
      }
  
      const csvFile = req.files.csvFile;
      
      // 檢查文件類型
      if (!csvFile.name.endsWith('.csv')) {
        return res.status(400).json({ 
          message: '只支持CSV文件格式' 
        });
      }
      
      // 暫存文件到臨時目錄
      const tempFilePath = path.join(__dirname, '../temp', `upload_${Date.now()}.csv`);
      
      // 確保臨時目錄存在
      if (!fs.existsSync(path.join(__dirname, '../temp'))) {
        fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
      }
      
      // 寫入臨時文件
      await fs.promises.writeFile(tempFilePath, csvFile.data);
      
      // 解析CSV文件
      const workLogs = await parseWorkLogCSV(tempFilePath);
      
      // 驗證並存儲工作日誌
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };
      
      for (const workLog of workLogs) {
        // 驗證數據
        const validation = validateWorkLog(workLog);
        
        if (!validation.isValid) {
          results.failed++;
          results.errors.push({
            data: workLog,
            errors: validation.errors
          });
          continue;
        }
        
        try {
          // 存儲到數據庫
          const query = `
            INSERT INTO work_logs 
            (user_id, location, crop, start_time, end_time, work_categories, details, harvest_quantity)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
          `;
          
          const values = [
            req.user.id,
            workLog.location,
            workLog.crop,
            workLog.startTime,
            workLog.endTime,
            workLog.workCategories,
            workLog.details,
            workLog.harvestQuantity
          ];
          
          await db.query(query, values);
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({
            data: workLog,
            errors: [err.message]
          });
        }
      }
      
      // 刪除臨時文件
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error('刪除臨時文件失敗:', unlinkError);
      }
      
      // 返回結果
      res.json({
        message: `CSV處理完成，成功：${results.success}，失敗：${results.failed}`,
        results
      });
    } catch (error) {
      console.error('CSV上傳處理失敗:', error);
      res.status(500).json({ 
        message: '處理CSV文件失敗',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  },
  
  // 管理員覆核工作日誌
  async reviewWorkLog(req, res) {
    const { workLogId } = req.params;
    const { status } = req.body;

    try {
      const query = `
        UPDATE work_logs 
        SET status = $1, 
            reviewed_at = CURRENT_TIMESTAMP, 
            reviewer_id = $2
        WHERE id = $3
      `;

      const values = [
        status, 
        req.user.id,  // 管理員ID
        workLogId
      ];

      await db.query(query, values);
      
      res.json({ message: '工作日誌覆核成功' });
    } catch (error) {
      console.error('覆核工作日誌失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },
  
  // 匯出工作日誌
  async exportWorkLogs(req, res) {
    const { startDate, endDate, format = 'csv' } = req.query;

    try {
      const searchParams = {
        startDate,
        endDate,
        format: 'csv'
      };

      if (req.user.role !== 'admin') {
        searchParams.userId = req.user.id;
      }

      const result = await WorkLogController.searchWorkLogs(searchParams);
      const csv = result.data;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="work_logs.csv"');
      res.send(csv);
    } catch (error) {
      console.error('匯出工作日誌失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

// WorkLogController 中添加或修改此方法
async getTodayHour(req, res) {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0]; // 獲取今天的日期 YYYY-MM-DD

  try {
    // 查詢今日工作日誌
    const query = `
      SELECT start_time, end_time
      FROM work_logs
      WHERE user_id = $1
      AND DATE(created_at) = $2
    `;

    const result = await db.query(query, [userId, today]);
    const workLogs = result.rows;

    // 計算總工時
    let totalMinutes = 0;
    
    workLogs.forEach(log => {
      if (!log.start_time || !log.end_time) return;
      
      const startParts = log.start_time.split(':');
      const endParts = log.end_time.split(':');
      
      if (startParts.length !== 2 || endParts.length !== 2) return;
      
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      
      if (isNaN(startMinutes) || isNaN(endMinutes)) return;
      
      // 排除午休時間 (12:00-13:00)
      if (startMinutes < 12 * 60 && endMinutes > 13 * 60) {
        totalMinutes += (endMinutes - startMinutes - 60);
      } else {
        totalMinutes += (endMinutes - startMinutes);
      }
    });
    
    const totalHours = totalMinutes / 60;
    const formattedTotalHours = totalHours.toFixed(2);
    const remainingHours = Math.max(0, 8 - totalHours).toFixed(2);
    const isComplete = totalHours >= 8;

    res.json({
      total_hours: formattedTotalHours,
      remaining_hours: remainingHours,
      is_complete: isComplete
    });
  } catch (error) {
    console.error('獲取今日工時失敗:', error);
    res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
  }
}
};

module.exports = WorkLogController;