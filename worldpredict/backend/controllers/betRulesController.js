const { getPool, sql } = require("../config/db");

// ─── GET /api/betrules ────────────────────────────────────────────────────────
async function getBetRules(req, res) {
  const pool = await getPool();
  const result = await pool.request().query(
    "SELECT Round, WinAmount, DrawAmount, LoseAmount, DefaultLoseAmount FROM BetRules"
  );
  // Trả về dạng object { "Vòng bảng": {...}, ... } giống frontend
  const rules = {};
  for (const r of result.recordset) {
    rules[r.Round] = {
      winAmount:         Number(r.WinAmount),
      drawAmount:        Number(r.DrawAmount),
      loseAmount:        Number(r.LoseAmount),
      defaultLoseAmount: Number(r.DefaultLoseAmount),
    };
  }
  res.json(rules);
}

// ─── PUT /api/betrules (admin only) ──────────────────────────────────────────
async function saveBetRule(req, res) {
  const { round, winAmount, drawAmount, loseAmount, defaultLoseAmount } = req.body;
  if (!round) return res.status(400).json({ message: "Thiếu tên vòng đấu" });

  const pool = await getPool();
  await pool.request()
    .input("round",            sql.NVarChar, round)
    .input("winAmount",        sql.BigInt,   winAmount        || 0)
    .input("drawAmount",       sql.BigInt,   drawAmount       || 0)
    .input("loseAmount",       sql.BigInt,   loseAmount       || 0)
    .input("defaultLoseAmount",sql.BigInt,   defaultLoseAmount|| 0)
    .query(`
      IF EXISTS (SELECT 1 FROM BetRules WHERE Round = @round)
        UPDATE BetRules
        SET WinAmount = @winAmount, DrawAmount = @drawAmount,
            LoseAmount = @loseAmount, DefaultLoseAmount = @defaultLoseAmount
        WHERE Round = @round
      ELSE
        INSERT INTO BetRules (Round, WinAmount, DrawAmount, LoseAmount, DefaultLoseAmount)
        VALUES (@round, @winAmount, @drawAmount, @loseAmount, @defaultLoseAmount)
    `);

  res.json({ message: `Đã lưu quy tắc tiền cược vòng ${round}` });
}

module.exports = { getBetRules, saveBetRule };
