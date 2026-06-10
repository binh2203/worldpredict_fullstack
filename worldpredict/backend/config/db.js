const { Pool } = require("pg");
require("dotenv").config();

// ─── POSTGRES CONFIG (SUPABASE) ─────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─── LOG INIT ───────────────────────────────────────────────
console.log("🟢 PostgreSQL pool created");

// ─── QUERY HELPER ───────────────────────────────────────────
async function query(text, params) {
  return pool.query(text, params);
}

// ─── CLOSE POOL ─────────────────────────────────────────────
async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  closePool,
};