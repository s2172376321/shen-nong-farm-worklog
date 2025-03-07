# 神農山莊工作日誌系統

## 專案簡介
這是一個為神農山莊設計的工作日誌管理系統，提供員工記錄每日工作、管理者審核工作紀錄的平台。

## 主要功能
- 使用者登入（帳號密碼/Google登入）
- 工作日誌填寫
- 工作日誌搜尋與篩選
- 管理員公告系統
- 使用者反饋機制

## 技術棧
### 前端
- React
- React Router
- Tailwind CSS
- Axios

### 後端
- Node.js
- Express
- PostgreSQL
- JWT 驗證

## 環境需求
- Node.js v16+
- PostgreSQL v13+
- npm / yarn

## 安裝步驟
1. 克隆專案
```bash
git clone https://github.com/your-username/shen-nong-farm-worklog.git
cd shen-nong-farm-worklog
```

2. 安裝後端依賴
```bash
cd backend
npm install
```

3. 安裝前端依賴
```bash
cd ../frontend
npm install
```

4. 設定環境變數
- 後端：在 `backend/.env` 中配置資料庫連線
- 前端：在 `frontend/.env` 中配置 API 地址

5. 資料庫遷移
```bash
cd backend
npm run migrate
```

6. 啟動開發伺服器
- 後端：`npm run dev`
- 前端：`npm start`

## 部署
- 後端：建議使用 Heroku、AWS、GCP 等平台
- 前端：建議使用 Netlify、Vercel

## 貢獻指南
1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m '新增一些令人驚豔的功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 授權
此專案使用 MIT 授權