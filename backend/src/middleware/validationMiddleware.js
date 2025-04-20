// 工作日誌驗證中間件
const validateWorkLog = (req, res, next) => {
  const { location, crop, startTime, endTime } = req.body;

  // 驗證必填欄位
  if (!location || !crop || !startTime || !endTime) {
    return res.status(400).json({
      message: '缺少必要欄位',
      details: {
        location: !location ? '位置為必填' : null,
        crop: !crop ? '作物為必填' : null,
        startTime: !startTime ? '開始時間為必填' : null,
        endTime: !endTime ? '結束時間為必填' : null
      }
    });
  }

  // 驗證時間格式 (HH:mm)
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return res.status(400).json({
      message: '時間格式錯誤',
      details: {
        startTime: !timeRegex.test(startTime) ? '開始時間格式應為 HH:mm' : null,
        endTime: !timeRegex.test(endTime) ? '結束時間格式應為 HH:mm' : null
      }
    });
  }

  // 驗證時間順序
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (endMinutes <= startMinutes) {
    return res.status(400).json({
      message: '結束時間必須晚於開始時間'
    });
  }

  // 驗證工作時長不超過24小時
  if (endMinutes - startMinutes > 24 * 60) {
    return res.status(400).json({
      message: '工作時長不能超過24小時'
    });
  }

  // 驗證收穫數量為非負數
  if (req.body.harvestQuantity && req.body.harvestQuantity < 0) {
    return res.status(400).json({
      message: '收穫數量不能為負數'
    });
  }

  // 驗證備註長度
  if (req.body.details && req.body.details.length > 500) {
    return res.status(400).json({
      message: '備註不能超過500字'
    });
  }

  next();
};

// 驗證日期格式
const validateDate = (req, res, next) => {
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({
      message: '日期參數為必填'
    });
  }

  // 驗證日期格式 (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({
      message: '日期格式應為 YYYY-MM-DD'
    });
  }

  // 驗證日期有效性
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return res.status(400).json({
      message: '無效的日期'
    });
  }

  next();
};

// 驗證工作日誌ID
const validateWorkLogId = (req, res, next) => {
  const { workLogId } = req.params;
  
  if (!workLogId || isNaN(workLogId)) {
    return res.status(400).json({
      message: '無效的工作日誌ID'
    });
  }

  next();
};

// 驗證審核狀態
const validateReviewStatus = (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'approved', 'rejected'];
  
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      message: '無效的審核狀態',
      details: `狀態必須是: ${validStatuses.join(', ')}`
    });
  }

  next();
};

module.exports = {
  validateWorkLog,
  validateDate,
  validateWorkLogId,
  validateReviewStatus
}; 