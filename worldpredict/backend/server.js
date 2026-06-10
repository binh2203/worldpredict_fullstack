require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cors = require("cors");

const { getPool } = require("./config/db");
const routes = require("./routes/index");
const errorHandler = require("./middleware/errorHandler");
const { syncFromZafronix } = require("./services/syncFixtures");

const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────
// CORS (production-safe)
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow server-to-server / mobile / postman
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".onrender.com");

      if (isAllowed) {
        return callback(null, true);
      }

      // ⚠️ không nên luôn true trong production
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

// ─────────────────────────────────────────────
// HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date(),
    backendMode: "production",
  });
});

// ─────────────────────────────────────────────
// ROUTES
app.use("/api", routes);

// ─────────────────────────────────────────────
// ERROR HANDLER (must be last)
app.use(errorHandler);

// ─────────────────────────────────────────────
// JOB FLAGS
let autoLockStarted = false;
let syncStarted = false;

// ─────────────────────────────────────────────
// AUTO LOCK JOB
async function startAutoLockJob() {
  if (autoLockStarted) return;
  autoLockStarted = true;

  try {
    const pool = await getPool();

    setInterval(async () => {
      try {
        // ⚠️ nếu DB disconnect → tránh crash
        await pool.query(`SELECT sp_auto_lock_matches()`);
      } catch (e) {
        console.warn("⚠️ Auto-lock error:", e.message);
      }
    }, 30_000);

    console.log("⏰ Auto-lock job started (30s)");
  } catch (e) {
    console.warn("⚠️ Auto-lock init failed:", e.message);
  }
}

// ─────────────────────────────────────────────
// SYNC JOB
async function startSyncJob() {
  if (syncStarted) return;
  syncStarted = true;

  if (!process.env.ZAFRONIX_API_KEY) {
    console.warn("⚠️ Missing ZAFRONIX_API_KEY → skip sync");
    return;
  }

  // initial sync
  try {
    const r = await syncFromZafronix();
    console.log(
      `📡 Initial sync: ${r.inserted} inserted, ${r.updated} updated`
    );
  } catch (e) {
    console.warn("⚠️ Initial sync failed:", e.message);
  }

  const interval =
    parseInt(process.env.SYNC_INTERVAL_SEC || "300") * 1000;

  setInterval(async () => {
    try {
      const r = await syncFromZafronix();

      if (r.inserted + r.updated > 0) {
        console.log(
          `📡 Sync: ${r.inserted} inserted, ${r.updated} updated`
        );
      }
    } catch (e) {
      console.warn("⚠️ Sync error:", e.message);
    }
  }, interval);

  console.log(`📡 Auto-sync started (${interval / 1000}s)`);
}

// ─────────────────────────────────────────────
// START SERVER
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  try {
    // ⚠️ lazy connect DB (tránh crash Render startup)
    await getPool();

    console.log("🟢 Database connected");

    await startAutoLockJob();
    await startSyncJob();
  } catch (e) {
    console.warn("⚠️ DB not ready:", e.message);
    console.warn("⚠️ Running in degraded mode");
  }
});