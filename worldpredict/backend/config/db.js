const sql = require("mssql");
require("dotenv").config();

// ─── DB CONFIG ─────────────────────────────────────────────────────────────
// Đọc từ .env — hỗ trợ cả local (SQLEXPRESS) và cloud (Render / Railway)
const sqlConfig = {
  server:   process.env.DB_SERVER   || "localhost",
  database: process.env.DB_NAME     || "PredictWC2026",
  user:     process.env.DB_USER     || undefined,
  password: process.env.DB_PASSWORD || undefined,
  port:     parseInt(process.env.DB_PORT || "1433"),
  options: {
    instanceName:           process.env.DB_INSTANCE || undefined,
    trustServerCertificate: true,
    encrypt:                process.env.DB_ENCRYPT === "true",
  },
};

// Nếu dùng Windows Auth local (không có user/pass) → dùng trustedConnection
if (!sqlConfig.user) {
  sqlConfig.options.trustedConnection = true;
}

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(sqlConfig);
    console.log(`✅ DB connected: ${sqlConfig.server} / ${sqlConfig.database}`);
  }
  return pool;
}

async function closePool() {
  if (pool) { await pool.close(); pool = null; }
}

module.exports = { sql, getPool, closePool };
