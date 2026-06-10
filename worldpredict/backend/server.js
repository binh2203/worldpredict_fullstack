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
// TRUST PROXY (Render / Netlify fix CORS issues)
// ─────────────────────────────────────────────
app.set("trust proxy", 1);


// ─────────────────────────────────────────────
// CORS FIX (IMPORTANT - FULL PRODUCTION SAFE)
// ─────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "https://worldpredict.netlify.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow mobile apps / server-to-server (no origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // allow vercel / netlify preview
    if (origin.endsWith(".netlify.app") || origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    return callback(new Error("Blocked by CORS: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


// ─────────────────────────────────────────────
// PRE-FLIGHT FIX (CRITICAL)
// ─────────────────────────────────────────────
app.options("*", cors());


app.use(express.json());


// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get("/health", (req, res) =>
  res.json({ status: "ok", time: new Date() })
);


// ─────────────────────────────────────────────
// API ROUTES (ONLY ONE SOURCE OF TRUTH)
// ─────────────────────────────────────────────
app.use("/api", routes);


// ─────────────────────────────────────────────
// ERROR HANDLER
// ─────────────────────────────────────────────
app.use(errorHandler);



// ─────────────────────────────────────────────
// AUTO LOCK JOB
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