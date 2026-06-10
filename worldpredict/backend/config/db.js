const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function getPool() {
  return pool;
}

function closePool() {
  return pool.end();
}

module.exports = {
  getPool,
  pool,
  closePool,
};