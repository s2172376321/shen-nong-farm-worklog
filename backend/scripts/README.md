# 資料庫備份與還原工具

這個目錄包含了用於備份和還原資料庫的工具。

## 備份資料庫

執行以下命令來備份資料庫：

```bash
node backup.js
```

這將在 `backend/backups` 目錄中建立一個新的備份檔案，檔名格式為 `backup_YYYY-MM-DDTHH-mm-ss.sql`。

## 還原資料庫

執行以下命令來還原資料庫：

```bash
node restore.js <備份檔案名稱>
```

例如：
```bash
node restore.js backup_2024-01-01T12-00-00.sql
```

如果沒有指定備份檔案名稱，腳本會列出所有可用的備份檔案。

## 注意事項

1. 確保已經安裝了 PostgreSQL 命令列工具（pg_dump 和 psql）
2. 確保 `.env` 檔案中的資料庫連接設定正確
3. 建議定期進行備份
4. 還原資料庫時會覆蓋現有的資料，請謹慎操作

## 環境變數設定

在 `.env` 檔案中需要設定以下變數：

```env
DB_NAME=shen_nong_worklog
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
``` 