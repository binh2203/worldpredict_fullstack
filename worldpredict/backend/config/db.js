const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "PredictWC2026",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "Hanhbac18@",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

pool.on("connect", (client) => {
  client.query("SET timezone = 'UTC'");
  console.log(`✅ DB connected: ${process.env.DB_HOST || "localhost"} / ${process.env.DB_NAME}`);
});

pool.on("error", (err) => {
  console.error("❌ Unexpected DB error:", err.message);
});

async function getPool() {
  return pool;
}

async function closePool() {
  await pool.end();
}

module.exports = { pool, getPool, closePool };
