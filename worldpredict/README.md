# ⚽ World Predict 2026

Ứng dụng dự đoán kết quả World Cup 2026 — React frontend + Node.js/Express backend + SQL Server.

---

## 📁 Cấu trúc dự án

```
worldpredict/
│
├── index.html                   ← HTML entry (Vite)
├── vite.config.js               ← Vite + proxy /api → backend
├── package.json                 ← Frontend dependencies
│
├── src/                         ─── FRONTEND (React) ──────────────────
│   ├── main.jsx                 ← React entry point
│   ├── App.jsx                  ← Root component, wire-up tất cả
│   │
│   ├── constants/
│   │   └── index.js             ← ROUNDS, DEFAULT_BET_RULES, MOCK_TEAMS, API_URL
│   │
│   ├── styles/
│   │   ├── theme.js             ← Màu sắc design tokens (C.gold, C.bg, ...)
│   │   └── globalCss.js        ← CSS string inject vào <style> tag
│   │
│   ├── utils/
│   │   ├── helpers.js           ← applyHandicap, getMatchResult, fmtDate, store, ...
│   │   └── mockData.js          ← makeMockMatches(), DEFAULT_ADMIN
│   │
│   ├── services/
│   │   └── api.js               ← Tất cả HTTP calls đến backend
│   │
│   ├── hooks/
│   │   └── useAppStore.js       ← Global state + business logic (auth, predict, ...)
│   │
│   ├── components/              ← Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── MatchCard.jsx
│   │   ├── Modal.jsx            ← Login/Register/SetResult/Handicap
│   │   └── Toast.jsx            ← Toast + Confetti
│   │
│   └── pages/                   ← Các trang
│       ├── PageHome.jsx
│       ├── PageMatches.jsx
│       ├── PageLeaderboard.jsx
│       ├── PageHistory.jsx
│       └── PageAdmin.jsx
│
└── backend/                     ─── BACKEND (Node.js / Express) ────────
    ├── server.js                ← Entry point, Express app + auto-lock job
    ├── package.json
    ├── .env.example             ← Copy → .env và điền thông tin
    │
    ├── config/
    │   ├── db.js                ← SQL Server connection pool (mssql)
    │   └── seed.js              ← npm run seed: tạo admin + bet rules + matches mẫu
    │
    ├── middleware/
    │   ├── auth.js              ← JWT verify + adminOnly guard
    │   └── errorHandler.js      ← Global error handler
    │
    ├── controllers/             ← Business logic cho từng domain
    │   ├── authController.js    ← register, login
    │   ├── matchesController.js ← getMatches, setHandicap, setResult, autoLock
    │   ├── predictionsController.js ← getMyPredictions, getAllPredictions, predict
    │   ├── usersController.js   ← getUsers, getMyStats, createUser, toggleUserActive, getLeaderboard
    │   └── betRulesController.js ← getBetRules, saveBetRule
    │
    ├── routes/
    │   └── index.js             ← Tất cả API routes tập trung 1 file
    │
    └── sql/
        └── schema.sql           ← SQL schema + sp_SetMatchResult + sp_AutoLockMatches
```

---

## 🚀 Cài đặt & Chạy

### 1. Database (SQL Server)
```sql
-- Chạy file backend/sql/schema.sql trong SQL Server Management Studio
-- Tạo database PredictWC2026 + tất cả bảng + stored procedures
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # Điền DB_SERVER, JWT_SECRET
npm install
npm run seed                # Tạo admin + dữ liệu mẫu
npm run dev                 # Chạy port 5000 (nodemon)
```

### 3. Frontend
```bash
# Ở thư mục gốc worldpredict/
npm install
npm run dev                 # Chạy port 3000, proxy /api → :5000
```

---

## ⚙️ Chuyển đổi Mock ↔ Backend thật

Trong `src/constants/index.js`:
```js
export const USE_MOCK = true;   // ← false khi backend sẵn sàng
```

- `USE_MOCK = true` → Chạy offline, dùng localStorage, không cần backend
- `USE_MOCK = false` → Gọi API thật, token JWT, SQL Server

---

## 🔌 API Endpoints

| Method | Path                             | Auth    | Mô tả                            |
|--------|----------------------------------|---------|----------------------------------|
| POST   | /api/auth/register               | –       | Đăng ký                          |
| POST   | /api/auth/login                  | –       | Đăng nhập → JWT token            |
| GET    | /api/matches                     | –       | Lấy tất cả trận                  |
| PUT    | /api/matches/:id/handicap        | Admin   | Thiết lập kèo chấp               |
| POST   | /api/matches/:id/result          | Admin   | Nhập kết quả (niêm phong vĩnh viễn) |
| POST   | /api/matches/auto-lock           | Admin   | Trigger sp_AutoLockMatches       |
| GET    | /api/predictions/my              | User    | Dự đoán của tôi                  |
| GET    | /api/predictions/all             | Admin   | Tất cả dự đoán                   |
| POST   | /api/predictions                 | User    | Gửi dự đoán                      |
| GET    | /api/betrules                    | –       | Quy tắc tiền cược                |
| PUT    | /api/betrules                    | Admin   | Cập nhật quy tắc                 |
| GET    | /api/users                       | Admin   | Danh sách user                   |
| GET    | /api/users/my-stats              | User    | Thống kê cá nhân                 |
| POST   | /api/users                       | Admin   | Tạo user mới                     |
| PUT    | /api/users/:id/toggle-active     | Admin   | Khoá/Mở user                     |
| GET    | /api/leaderboard                 | –       | Bảng xếp hạng                    |

---

## 🛡️ Chính sách minh bạch
- Dự đoán **tự động khóa 30 phút** trước giờ bóng lăn
- Kết quả sau khi admin nhập sẽ **niêm phong vĩnh viễn** (SQL guard trong `sp_SetMatchResult`)
- Người không dự đoán **mặc định bị trừ tiền**
- Mọi giao dịch lưu trong bảng `PredictionResults`

---

## 🔐 Tài khoản mặc định (sau seed)
| Username | Password  | Role  |
|----------|-----------|-------|
| admin    | admin123  | Admin |
