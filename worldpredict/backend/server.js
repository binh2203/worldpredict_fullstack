require("dotenv").config();
require("express-async-errors");
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const { getPool }          = require("./config/db");
const routes               = require("./routes/index");
const errorHandler         = require("./middleware/errorHandler");
const { startSyncService } = require("./services/syncService");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.CLIENT_URL || "http://localhost:3000",
    /\.vercel\.app$/,
    /\.onrender\.com$/,
    /\.ngrok-free\.app$/,
    "http://localhost:5173",
  ],
  credentials: true,
}));

// ── Ngrok bypass warning ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date() }));
app.use("/api",           routes);
app.use("/api/wc",        require("./routes/wcRoutes"));
app.use("/api/test-data", require("./routes/testDataRoutes"));
app.use(errorHandler);

// ── Serve frontend build ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist", "index.html"));
});

// ── Auto-lock job (mỗi 30 giây) ─────────────────────────────────────────────
async function startAutoLockJob() {
  try {
    const pool = await getPool();
    setInterval(async () => {
      try { await pool.query("SELECT sp_auto_lock_matches()"); }
      catch (e) { console.warn("⚠️ Auto-lock error:", e.message); }
    }, 30_000);
    console.log("⏰ Auto-lock job started (every 30s)");
  } catch (e) {
    console.warn("⚠️ Could not start auto-lock job:", e.message);
  }
}

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  try {
    await getPool();
    console.log("✅ Database connected");
    await startAutoLockJob();
    startSyncService();
  } catch (e) {
    console.warn("⚠️ DB not connected at startup:", e.message);
  }
});