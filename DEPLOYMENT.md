# TripSplit 部署指南

## 快速開始（本地測試）

### 第一步：安裝 Node.js
下載並安裝 Node.js（建議 v20 LTS）：
https://nodejs.org/en/download

### 第二步：安裝依賴
```bash
cd tripsplit
npm install
```

### 第三步：本地運行
```bash
npm run dev
```
瀏覽器開啟 http://localhost:3000

---

## 方案 A：Vercel 部署（最簡單，推薦）

### 1. 上傳至 GitHub
```bash
git init
git add .
git commit -m "Initial TripSplit app"
git branch -M main
# 在 GitHub 新建 repo，然後：
git remote add origin https://github.com/你的帳號/tripsplit.git
git push -u origin main
```

### 2. 部署至 Vercel
1. 到 https://vercel.com 登入（可用 GitHub 帳號）
2. 點 "New Project"
3. Import 你的 GitHub repo
4. 點 "Deploy"（無需額外設定，Next.js 自動識別）
5. 完成！獲得公開 URL，例如：https://tripsplit-xxx.vercel.app

**費用**：Vercel Hobby 方案完全免費，足夠 8 人使用

---

## 方案 B：接駁 Supabase 資料庫（多裝置同步）

目前 App 使用 localStorage（只儲存在本機）。
若要多人即時同步，需要接駁 Supabase：

### 1. 設定 Supabase
1. 到 https://supabase.com 建立免費帳號
2. New Project → 填寫名稱和密碼
3. 到 SQL Editor，貼上並執行 `supabase-schema.sql` 的內容
4. 到 Settings → API，複製 URL 和 anon key

### 2. 設定環境變數
建立 `.env.local` 檔案（不要 commit 此檔案）：
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. 安裝 Supabase SDK
```bash
npm install @supabase/supabase-js
```

### 4. 啟用 supabase.ts
開啟 `src/lib/supabase.ts`，取消注釋相關代碼。

### 5. 在 Vercel 加入環境變數
Vercel Dashboard → Project Settings → Environment Variables
加入 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY

---

## 方案 C：分享給朋友使用（無需伺服器）

若只需要單機使用，可以將整個資料匯出分享：

### 匯出資料
開啟瀏覽器 Console（F12）：
```javascript
const data = localStorage.getItem('tripsplit-storage');
console.log(data); // 複製此 JSON
```

### 匯入資料
在另一台裝置的 Console：
```javascript
localStorage.setItem('tripsplit-storage', '貼上 JSON');
location.reload();
```

---

## 技術架構

```
前端          : Next.js 14 + TypeScript + Tailwind CSS
狀態管理      : Zustand + localStorage (目前)
資料庫(未來)  : Supabase (PostgreSQL)
部署          : Vercel
圖表          : Recharts
```

## 檔案結構

```
src/
├── app/                    # Next.js App Router 頁面
│   ├── page.tsx            # 旅行列表
│   ├── trip/
│   │   ├── create/         # 建立旅行
│   │   └── [id]/
│   │       ├── page.tsx    # Dashboard
│   │       ├── expense/    # 支出
│   │       ├── members/    # 成員
│   │       ├── analytics/  # 分析
│   │       ├── currency/   # 匯率
│   │       ├── settle/     # 埋數
│   │       └── settings/   # 設定
├── components/
│   └── ui/                 # 共用 UI 元件
└── lib/
    ├── types.ts            # TypeScript 類型定義
    ├── calculations.ts     # 分賬計算邏輯
    ├── store.ts            # Zustand 狀態管理
    ├── mockData.ts         # 預設示範資料
    ├── utils.ts            # 工具函數
    └── supabase.ts         # 資料庫接口（預留）
```

## 計算邏輯

### 分賬計算
1. 每筆支出計算各成員應付金額
2. 支援：平均分 / 自訂金額 / 自訂百分比
3. 外幣自動換算為結算貨幣（HKD）

### 埋數演算法（最少交易次數）
```
1. 計算每人 net balance = 已付總額 - 應付總額
2. 分為 creditors（正數，別人欠你）和 debtors（負數，你欠別人）
3. Greedy 演算法：
   - 取最大 creditor 和最大 debtor
   - 轉賬 min(creditor餘額, debtor餘額)
   - 重複直至所有餘額為 0
4. 結果：最少的轉賬次數完成所有找數
```
