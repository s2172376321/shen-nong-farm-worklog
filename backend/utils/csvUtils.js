// 位置：backend/utils/csvUtils.js

// CSV 工具函式庫
const csvUtils = {
  // 將資料轉換為 CSV 格式
  convertToCSV(data, headers) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return '';
    }

    // 如果未提供標頭，使用物件的鍵值作為標頭
    const csvHeaders = headers || Object.keys(data[0]);
    const headerRow = csvHeaders.join(',');

    // 格式化數據行
    const csvRows = data.map(row => {
      return csvHeaders.map(header => {
        const value = row[header] ? row[header].toString() : '';
        // 如果值中包含逗號、引號或換行符，則將其包含在引號中
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    // 合併標頭行和數據行
    return [headerRow, ...csvRows].join('\n');
  },

  // 將 CSV 格式的字串解析為資料物件
  parseCSV(csvString, hasHeaders = true) {
    if (!csvString) {
      return { headers: [], data: [] };
    }

    // 將 CSV 拆分為行
    const rows = csvString.split(/\r?\n/).filter(row => row.trim());

    if (rows.length === 0) {
      return { headers: [], data: [] };
    }

    let headers = [];
    let startIdx = 0;

    if (hasHeaders) {
      // 處理標頭行
      headers = this.parseLine(rows[0]);
      startIdx = 1;
    } else {
      // 如果沒有標頭，使用索引作為標頭
      const firstRow = this.parseLine(rows[0]);
      headers = Array.from({ length: firstRow.length }, (_, i) => `column${i + 1}`);
    }

    // 解析數據行
    const data = [];
    for (let i = startIdx; i < rows.length; i++) {
      const values = this.parseLine(rows[i]);
      if (values.length > 0) {
        const rowObj = {};
        headers.forEach((header, idx) => {
          rowObj[header] = idx < values.length ? values[idx] : '';
        });
        data.push(rowObj);
      }
    }

    return { headers, data };
  },

  // 解析單行 CSV
  parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // 處理逃逸的引號 ("" -> ")
          current += '"';
          i++; // 跳過下一個引號
        } else {
          // 切換引號狀態
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // 如果遇到逗號且不在引號內，則完成當前值
        result.push(current);
        current = '';
      } else {
        // 添加當前字符到當前值
        current += char;
      }
    }

    // 添加最後一個值
    result.push(current);
    return result;
  },

  // 格式化日期為 CSV 友好格式
  formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return ''; // 無效日期
    
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }
};

module.exports = csvUtils;