const { getPool } = require("../config/db");

// GET /api/betrules
async function getBetRules(req, res) {
  const pool = await getPool();
  const result = await pool.query(
    "SELECT Round, WinPoints, LosePoints, DefaultLosePoints FROM betrules"
  );
  const rules = {};
  for (const r of result.rows) {
    rules[r.round] = {
      winPoints:         Number(r.winpoints),
      losePoints:        Number(r.losepoints),
      defaultLosePoints: Number(r.defaultlosepoints),
    };
  }
  res.json(rules);
}

// PUT /api/betrules (admin only)
async function saveBetRule(req, res) {
  const { round, winPoints, losePoints, defaultLosePoints } = req.body;
  if (!round) return res.status(400).json({ message: "Thiếu tên vòng đấu" });

  const pool = await getPool();
  await pool.query(`
    INSERT INTO betrules (Round, WinPoints, LosePoints, DefaultLosePoints)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (Round)
    DO UPDATE SET
      WinPoints         = EXCLUDED.WinPoints,
      LosePoints        = EXCLUDED.LosePoints,
      DefaultLosePoints = EXCLUDED.DefaultLosePoints
  `, [round, winPoints || 0, losePoints || 0, defaultLosePoints || 0]);

  res.json({ message: `Đã lưu quy tắc điểm vòng ${round}` });
}

module.exports = { getBetRules, saveBetRule };
