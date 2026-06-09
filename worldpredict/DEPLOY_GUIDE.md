# 🚀 Hướng dẫn Deploy WorldPredict lên Free Host (Public)

## Kiến trúc sau khi deploy

```
Internet
   │
   ├── Frontend (Vercel - FREE)
   │     https://worldpredict.vercel.app
   │
   └── Backend API (Render.com - FREE)
         https://worldpredict-api.onrender.com
               │
               └── SQL Server (Clever Cloud / Railway - FREE tier)
```

---

## BƯỚC 1 — Deploy Backend lên Render.com

### 1.1 Chuẩn bị file `.env` cho production
Tạo file `backend/.env.production`:
```env
PORT=5000
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-frontend.vercel.app

# SQL Server (dùng Clever Cloud hoặc Azure Free)
DB_SERVER=your-db-server.com
DB_NAME=PredictWC2026
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_PORT=1433

# API-Football
APIFOOTBALL_KEY=your_api_football_key
APIFOOTBALL_HOST=v3.football.api-sports.io
```

### 1.2 Thêm `render.yaml` vào thư mục `backend/`
```yaml
services:
  - type: web
    name: worldpredict-api
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
```

### 1.3 Sửa `backend/server.js` — thêm CORS cho production
```js
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    "http://localhost:3000",
    /\.vercel\.app$/,
  ],
  credentials: true,
}));
```

### 1.4 Push lên GitHub và kết nối Render
1. Tạo repo GitHub mới
2. Push code: `git push origin main`
3. Vào https://render.com → New → Web Service
4. Chọn repo → chọn thư mục `backend`
5. Điền env variables
6. Deploy! URL sẽ là: `https://worldpredict-api.onrender.com`

---

## BƯỚC 2 — Deploy Frontend lên Vercel

### 2.1 Sửa `src/constants.js`
```js
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
```

### 2.2 Tạo `.env.production` ở root frontend
```env
VITE_API_URL=https://worldpredict-api.onrender.com/api
```

### 2.3 Deploy lên Vercel
```bash
npm install -g vercel
vercel --prod
```
Hoặc: https://vercel.com → Import Git Repo → chọn thư mục frontend

---

## BƯỚC 3 — Database miễn phí

### Lựa chọn A: Clever Cloud (SQL Server - FREE)
1. https://www.clever-cloud.com → Add-on → MySQL (hoặc PostgreSQL)
2. **Lưu ý:** Clever Cloud dùng MySQL, cần chuyển schema từ T-SQL sang MySQL

### Lựa chọn B: Supabase (PostgreSQL - FREE 500MB)
1. https://supabase.com → New Project
2. Chuyển đổi schema SQL Server → PostgreSQL
3. Cập nhật `db.js` dùng `pg` thay vì `mssql`

### Lựa chọn C: Railway (PostgreSQL - FREE $5 credit)
1. https://railway.app → New → Database → PostgreSQL

---

## BƯỚC 4 — Cấu hình API-Football

Trong `backend/services/` tạo `footballService.js`:
```js
const axios = require("axios");

const football = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-rapidapi-key": process.env.APIFOOTBALL_KEY,
    "x-rapidapi-host": "v3.football.api-sports.io",
  },
});

// Lấy fixtures World Cup 2026 (league_id = 1 cho WC)
async function getFixtures(leagueId = 1, season = 2026) {
  const { data } = await football.get("/fixtures", {
    params: { league: leagueId, season },
  });
  return data.response;
}

// Lấy kết quả trận đã kết thúc
async function getResult(fixtureId) {
  const { data } = await football.get("/fixtures", {
    params: { id: fixtureId },
  });
  return data.response[0];
}

module.exports = { getFixtures, getResult };
```

---

## BƯỚC 5 — Kiểm tra sau deploy

Mở URL public → đăng nhập admin → vào 🧪 Test Mode → tải Test Scenario → test full flow

```
✅ Checklist:
□ Frontend load được
□ Đăng nhập admin hoạt động
□ Lịch đấu hiện đúng
□ User dự đoán được lưu
□ Admin nhập kết quả → điểm cập nhật
□ Bảng xếp hạng hiện đúng thứ tự
□ Test Mode: tải scenario, chạy qua 6 bước
```

---

## ⚡ Tóm tắt nhanh (khi đã có DB + API key)

```bash
# Backend
cd backend
npm install
# Điền .env
node server.js  # test local

# Frontend  
cd ..
npm install
npm run dev    # test local

# Deploy
git add . && git commit -m "deploy"
git push
# Vercel + Render tự build
```

**URL sau deploy:** `https://worldpredict.vercel.app` — ai cũng vô được từ internet!
