// 位置：backend/controllers/workLogController.js
const db = require('../config/database');
const csvUtils = require('../utils/csvUtils');
const path = require('path');
const fs = require('fs').promises;

// 工作時數計算工具函數
function calculateWorkHours(startTime, endTime) {
  try {
    // 確保處理的是 HH:MM 格式
    const cleanStartTime = startTime.substring(0, 5);
    const cleanEndTime = endTime.substring(0, 5);
    
    const startParts = cleanStartTime.split(':').map(Number);
    const endParts = cleanEndTime.split(':').map(Number);

    if (startParts.length !== 2 || endParts.length !== 2) {
      throw new Error('時間格式不正確');
    }

    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];

    let workMinutes = endMinutes - startMinutes;

    // 排除午休時間 (12:00-13:00)
    if (startMinutes < 12 * 60 && endMinutes > 13 * 60) {
      workMinutes -= 60;
    }

    const workHours = Math.max(0, workMinutes / 60);
    
    return {
      hours: Number(workHours.toFixed(2)),
      isValid: workHours > 0 && workHours <= 8
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
      // 記錄接收到的完整請求數據
      console.log('接收到工作日誌提交請求:', JSON.stringify(req.body, null, 2));
      
      const { 
        location, 
        crop, 
        startTime, 
        endTime,
        details,
        position_code,
        position_name,
        work_category_code,
        work_category_name,
        date, // 新增：接收可選的日期參數
        product_id,
        product_name,
        product_quantity,
        harvestQuantity
      } = req.body;
  
      // 時間格式驗證
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!startTime || !endTime || 
          !timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        return res.status(400).json({ 
          message: '時間格式不正確',
          details: '時間必須為 HH:MM 格式，且不能為空'
        });
      }
      
      // 確保時間格式為 HH:MM:00 (添加秒數)
      const formattedStartTime = startTime + ':00';
      const formattedEndTime = endTime + ':00';

      // 檢查位置和作物是否至少有一個有效值
      if ((!location && !position_name) || (!crop && !work_category_name)) {
        return res.status(400).json({ 
          message: '缺少必填欄位',
          details: '位置和作物/工作類別為必填項'
        });
      }
  
      // 計算工作時數
      const workHoursResult = calculateWorkHours(startTime, endTime);
      
      if (!workHoursResult.isValid) {
        return res.status(400).json({ 
          message: '工作時數計算錯誤',
          details: '工作時數必須大於0且不超過8小時'
        });
      }
  
      // 處理日期（使用傳入日期或當前日期）
      const workDate = date || new Date().toISOString().split('T')[0];
      
      // SQL查詢和參數
      const query = `
        INSERT INTO work_logs 
        (user_id, location, crop, start_time, end_time, work_hours, details, 
         location_code, position_code, position_name, 
         work_category_code, work_category_name, 
         product_id, product_name, product_quantity,
         harvest_quantity, created_at, work_categories)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id
      `;
      
      // 修改後的參數數組，使用格式化後的時間
      const values = [
        req.user.id,
        location || position_name || '', 
        crop || work_category_name || '', 
        formattedStartTime,  // 使用格式化後的時間
        formattedEndTime,    // 使用格式化後的時間
        workHoursResult.hours,
        details || '',
        req.body.location_code || '',
        position_code || '',
        position_name || '',
        work_category_code || '',
        work_category_name || '',
        product_id || '',
        product_name || '',
        product_quantity || 0,
        harvestQuantity || 0,
        // 指定創建日期
        new Date(workDate),
        req.body.work_categories || '{}' // 新增：默認為空數組
      ];
  
      // 嘗試插入資料庫
      console.log('執行SQL查詢:', {
        userId: req.user.id,
        workHours: workHoursResult.hours,
        startTime,
        endTime,
        workDate
      });
  
      const result = await db.query(query, values);
      
      // 成功回應
      res.status(201).json({
        message: '工作日誌創建成功',
        workLogId: result.rows[0].id,
        workHours: workHoursResult.hours,
        status: 'success'
      });
    } catch (error) {
      // 詳細記錄錯誤
      console.error('創建工作日誌失敗:', {
        error: error.message,
        stack: error.stack
      });
      
      // 檢查常見數據庫錯誤類型並提供友好訊息
      let errorMessage = '伺服器錯誤，請稍後再試';
      let statusCode = 500;
      
      const errorMap = {
        '23505': { message: '重複提交工作日誌', code: 400 },
        '23503': { message: '參考的外鍵不存在', code: 400 },
        '22P02': { message: '數據類型錯誤', code: 400 },
        '42P01': { message: '資料表不存在，請聯繫管理員', code: 500 },
        '42703': { message: '欄位不存在，可能需要更新資料庫結構', code: 500 }
      };
  
      const mappedError = errorMap[error.code];
      if (mappedError) {
        errorMessage = mappedError.message;
        statusCode = mappedError.code;
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

  // 優化後的 searchWorkLogs 函數
  async searchWorkLogs(req, res) {
  // 擴展參數處理，處理可能的參數命名錯誤
  let { location, crop, startDate, endDate, status, _tartDate, _ndDate } = req.query;
  
  // 修正可能的參數命名錯誤
  if (!startDate && _tartDate) {
    startDate = _tartDate;
    console.log('已修正參數: _tartDate -> startDate:', startDate);
  }
  
  if (!endDate && _ndDate) {
    endDate = _ndDate;
    console.log('已修正參數: _ndDate -> endDate:', endDate);
  }
  
  // 記錄所有收到的查詢參數，幫助診斷問題
  console.log('收到的所有查詢參數:', req.query);  
    try {
      console.log('收到工作日誌搜索請求:', {
        location, crop, startDate, endDate, status,
        userId: req.user?.id,
        userRole: req.user?.role
      });
      
      // 添加結果限制避免返回過多數據
      const LIMIT = 100; 
      
      // 優化 SQL 查詢 - 增加索引提示並限制返回欄位
      let queryText = `
        SELECT wl.id, wl.user_id, wl.location, wl.crop, 
               wl.start_time, wl.end_time, wl.work_hours, 
               wl.details, wl.position_name, wl.work_category_name,
               wl.status, wl.created_at, u.username
        FROM work_logs wl
        JOIN users u ON wl.user_id = u.id
        WHERE 1=1
      `;
      
      const values = [];
      let paramIndex = 1;
  
      // 如果是使用者查詢，只顯示自己的工作日誌(除非是管理員)
      if (!req.user.role || req.user.role !== 'admin') {
        queryText += ` AND wl.user_id = $${paramIndex}`;
        values.push(req.user.id);
        paramIndex++;
      }
  
      if (location) {
        queryText += ` AND (wl.location ILIKE $${paramIndex} OR wl.position_name ILIKE $${paramIndex})`;
        values.push(`%${location}%`);
        paramIndex++;
      }
  
      if (crop) {
        queryText += ` AND (wl.crop ILIKE $${paramIndex} OR wl.work_category_name ILIKE $${paramIndex})`;
        values.push(`%${crop}%`);
        paramIndex++;
      }
  
      // 添加狀態過濾
      if (status) {
        queryText += ` AND wl.status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }
  
      if (startDate && endDate) {
        // 使用 DATE() 函數優化日期比較
        queryText += ` AND DATE(wl.created_at) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        values.push(startDate, endDate);
        paramIndex += 2;
      }
  
      // 添加排序、限制和超時設置
      queryText += ' ORDER BY wl.created_at DESC';
      queryText += ` LIMIT ${LIMIT}`;  // 明確限制結果數量
  
      console.log('執行 SQL:', queryText);
      console.log('參數:', values);
  
      // 添加查詢超時設定
      const queryOptions = { 
        text: queryText, 
        values: values,
        timeout: 10000  // 設置數據庫查詢超時為 10 秒
      };
  
      const result = await db.query(queryOptions);
      
      console.log(`查詢到 ${result.rows.length} 條工作日誌`);
      
      // 標準化時間格式，確保前端能正確顯示
      const formattedResults = result.rows.map(log => ({
        ...log,
        start_time: log.start_time ? log.start_time.substring(0, 5) : log.start_time,
        end_time: log.end_time ? log.end_time.substring(0, 5) : log.end_time
      }));
      
      res.json(formattedResults);
    } catch (error) {
      console.error('查詢工作日誌失敗:', {
        error: error.message,
        stack: error.stack,
        query: error.query
      });
      res.status(500).json({ 
        message: '查詢工作日誌失敗，請稍後再試',
        error: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
  },
    
  // 添加內部搜索方法
  async internalSearch(params) {
    const { location, crop, startDate, endDate, status, userId } = params;

    try {
      let queryText = `
        SELECT wl.*, u.username, u.name as user_full_name
        FROM work_logs wl
        JOIN users u ON wl.user_id = u.id
        WHERE 1=1
      `;
      const values = [];
      let paramIndex = 1;

      if (userId) {
        queryText += ` AND wl.user_id = $${paramIndex}`;
        values.push(userId);
        paramIndex++;
      }

      if (location) {
        queryText += ` AND wl.location ILIKE $${paramIndex}`;
        values.push(`%${location}%`);
        paramIndex++;
      }

      if (crop) {
        queryText += ` AND wl.crop ILIKE $${paramIndex}`;
        values.push(`%${crop}%`);
        paramIndex++;
      }

      if (status) {
        queryText += ` AND wl.status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }

      if (startDate && endDate) {
        queryText += ` AND wl.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        values.push(startDate, endDate);
        paramIndex += 2;
      }

      queryText += ' ORDER BY wl.created_at DESC';
      queryText += ' LIMIT 100'; // 添加限制以避免返回過多資料

      const result = await db.query(queryText, values);
      
      return result.rows;
    } catch (error) {
      console.error('內部查詢工作日誌失敗:', error);
      throw error;
    }
  },
  
  // CSV 上傳功能
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
      const tempDir = path.join(__dirname, '../temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      // 寫入臨時文件
      await fs.writeFile(tempFilePath, csvFile.data);
      
      // 解析CSV文件
      const workLogs = await csvUtils.parseWorkLogCSV(tempFilePath);
      
      // 驗證並存儲工作日誌
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };
      
      for (const workLog of workLogs) {
        try {
          // 計算工作時數
          const workHoursResult = calculateWorkHours(workLog.startTime, workLog.endTime);
          
          if (!workHoursResult.isValid) {
            throw new Error('工作時數無效');
          }
          
          // 存儲到數據庫
          const query = `
            INSERT INTO work_logs 
            (user_id, location, crop, start_time, end_time, work_hours, details)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `;
          
          const values = [
            req.user.id,
            workLog.location,
            workLog.crop,
            workLog.startTime,
            workLog.endTime,
            workHoursResult.hours,
            workLog.details || ''
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
        await fs.unlink(tempFilePath);
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
      // 驗證 UUID 格式
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(workLogId)) {
        return res.status(400).json({ message: '無效的工作日誌 ID 格式' });
      }

      // 驗證狀態值
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: '無效的狀態值' });
      }

      // 執行更新
      const query = `
        UPDATE work_logs 
        SET status = $1, 
            reviewed_at = CURRENT_TIMESTAMP, 
            reviewer_id = $2
        WHERE id = $3
        RETURNING id
      `;

      const values = [
        status, 
        req.user.id,
        workLogId
      ];

      const result = await db.query(query, values);
      
      // 檢查是否有更新任何行
      if (result.rowCount === 0) {
        return res.status(404).json({ message: '找不到指定的工作日誌' });
      }
      
      res.json({ 
        message: '工作日誌覆核成功',
        workLogId: result.rows[0].id 
      });
    } catch (error) {
      console.error('覆核工作日誌失敗:', {
        error: error.message,
        code: error.code,
        workLogId,
        status,
        reviewerId: req.user.id
      });
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  },

  // 獲取今日工時
  async getTodayHour(req, res) {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    try {
      const query = `
        SELECT 
          COALESCE(SUM(work_hours), 0) as total_hours
        FROM work_logs
        WHERE user_id = $1
        AND DATE(created_at) = $2
      `;

      const result = await db.query(query, [userId, today]);
      const totalHours = result.rows[0].total_hours;

      const formattedTotalHours = Number(totalHours).toFixed(2);
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

      // 如果不是管理員，只匯出當前用戶的工作日誌
      if (req.user.role !== 'admin') {
        searchParams.userId = req.user.id;
      }

      // 使用內部搜索方法
      const workLogs = await this.internalSearch(searchParams);

      // 使用 CSV 工具轉換工作日誌為 CSV
      const csvContent = await csvUtils.convertToCSV(workLogs, [
        'id', 'user_id', 'location', 'crop', 
        'start_time', 'end_time', 'work_hours', 
        'created_at', 'status'
      ]);

      // 設置 HTTP 回應標頭
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="work_logs.csv"');
      
      // 傳送 CSV 內容
      res.send(csvContent);
    } catch (error) {
      console.error('匯出工作日誌失敗:', error);
      res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
  }
};

module.exports = WorkLogController;