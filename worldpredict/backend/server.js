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

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:3000",
    "http://localhost:5173",
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (
            allowedOrigins.includes(origin) ||
            origin.endsWith(".vercel.app") ||
            origin.endsWith(".onrender.com")
        ) {
            return callback(null, true);
        }

        return callback(null, true); // tránh crash khi dev
    },
    credentials: true,
}));

app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        time: new Date(),
        backendMode: true,
    });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", routes);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── FLAGS chống chạy trùng job ───────────────────────────────────────────────
let autoLockStarted = false;
let syncStarted = false;

// ─── Auto-lock job ────────────────────────────────────────────────────────────
async function startAutoLockJob() {
    if (autoLockStarted) return;
    autoLockStarted = true;

    try {
        const pool = await getPool();

        setInterval(async () => {
            try {
                await pool.request().execute("sp_AutoLockMatches");
            } catch (e) {
                console.warn("⚠️ Auto-lock error:", e.message);
            }
        }, 30_000);

        console.log("⏰ Auto-lock job started (every 30s)");
    } catch (e) {
        console.warn("⚠️ Auto-lock init failed:", e.message);
    }
}

// ─── Auto-sync Zafronix ───────────────────────────────────────────────────────
async function startSyncJob() {
    if (syncStarted) return;
    syncStarted = true;

    if (!process.env.ZAFRONIX_API_KEY) {
        console.warn("⚠️ ZAFRONIX_API_KEY chưa cấu hình → bỏ sync");
        return;
    }

    // Sync lần đầu
    try {
        const r = await syncFromZafronix();
        console.log(`📡 Initial sync: ${r.inserted} inserted, ${r.updated} updated`);
    } catch (e) {
        console.warn("⚠️ Initial sync failed:", e.message);
    }

    // Sync định kỳ
    const interval = parseInt(process.env.SYNC_INTERVAL_SEC || "300") * 1000;

    setInterval(async () => {
        try {
            const r = await syncFromZafronix();
            if (r.inserted + r.updated > 0) {
                console.log(`📡 Sync: ${r.inserted} inserted, ${r.updated} updated`);
            }
        } catch (e) {
            console.warn("⚠️ Sync error:", e.message);
        }
    }, interval);

    console.log(`📡 Auto-sync started (${interval / 1000}s)`);
}

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);

    try {
        await getPool();
        console.log("🟢 Database connected");

        await startAutoLockJob();
        await startSyncJob();
    } catch (e) {
        console.warn("⚠️ DB not connected:", e.message);
        console.warn("Frontend sẽ chạy Mock Mode");
    }
});