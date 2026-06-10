require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cors    = require("cors");
const path    = require("path");

const { getPool } = require("./config/db");

const routes       = require("./routes/index");
const errorHandler = require("./middleware/errorHandler");

const { startSyncService } = require("./services/syncService");

const app  = express();
const PORT = process.env.PORT || 5000;


// ─────────────────────────────────────────────
// CORS (production safe)
// ─────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    "http://localhost:5173"
  ],
  credentials: true,
}));


app.use(express.json());


// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get("/health", (req, res) =>
  res.json({ status: "ok", time: new Date() })
);


// ─────────────────────────────────────────────
// API ROUTES (ONLY 1 SOURCE OF TRUTH)
// ─────────────────────────────────────────────
app.use("/api", routes);


// ❌ REMOVE THIS (IMPORTANT)
// app.use("/api/wc", require("./routes/wcRoutes"));


// ─────────────────────────────────────────────
// ERROR HANDLER
// ─────────────────────────────────────────────
app.use(errorHandler);


// ─────────────────────────────────────────────
// FRONTEND SERVE (VITE / NETLIFY BUILD COPY)
// ─────────────────────────────────────────────
const frontendDist = path.join(__dirname, "../frontend/dist");

app.use(express.static(frontendDist));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});


// ─────────────────────────────────────────────
// AUTO-LOCK JOB (30s)
// ─────────────────────────────────────────────
async function startAutoLockJob() {
  try {
    const pool = await getPool();

    setInterval(async () => {
      try {
        await pool.query("SELECT sp_auto_lock_matches()");
      } catch (e) {
        console.warn("⚠️ Auto-lock error:", e.message);
      }
    }, 30_000);

    console.log("⏰ Auto-lock job started (30s)");
  } catch (e) {
    console.warn("⚠️ Could not start auto-lock job:", e.message);
  }
}


// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  try {
    await getPool();
    console.log("✅ Database connected");

    await startAutoLockJob();
    startSyncService();

  } catch (e) {
    console.warn("⚠️ DB not connected at startup:", e.message);
  }
});