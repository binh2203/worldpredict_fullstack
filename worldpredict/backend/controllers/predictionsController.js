const { getPool, sql } = require("../config/db");

// ─── GET /api/predictions/my ──────────────────────────────────────────────────
async function getMyPredictions(req, res) {
  const pool = await getPool();
  const result = await pool.request()
    .input("userId", sql.Int, req.user.id)
    .query(`
      SELECT
        p.Id, p.UserId, p.MatchId, p.Choice, p.CreatedAt,
        pr.IsCorrect, pr.MoneyChange, pr.Reason, pr.CalculatedAt
      FROM Predictions p
      LEFT JOIN PredictionResults pr ON pr.PredictionId = p.Id AND pr.UserId = p.UserId
      WHERE p.UserId = @userId
      ORDER BY p.CreatedAt DESC
    `);
  res.json(result.recordset.map(formatPred));
}

// ─── GET /api/predictions/all (admin only) ────────────────────────────────────
async function getAllPredictions(req, res) {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      p.Id, p.UserId, p.MatchId, p.Choice, p.CreatedAt,
      u.FullName AS UserName,
      pr.IsCorrect, pr.MoneyChange, pr.Reason
    FROM Predictions p
    JOIN Users u ON u.Id = p.UserId
    LEFT JOIN PredictionResults pr ON pr.PredictionId = p.Id
    ORDER BY p.CreatedAt DESC
  `);
  res.json(result.recordset);
}

// ─── POST /api/predictions ────────────────────────────────────────────────────
async function predict(req, res) {
  const { matchId, choice } = req.body;
  if (!matchId || !["home", "draw", "away"].includes(choice)) {
    return res.status(400).json({ message: "Dữ liệu dự đoán không hợp lệ" });
  }

  const pool = await getPool();

  // Guard: kiểm tra trận có bị khóa không
  const matchResult = await pool.request()
    .input("matchId", sql.Int, matchId)
    .query("SELECT IsLocked, ResultLocked, MatchDate FROM Matches WHERE Id = @matchId");
  const match = matchResult.recordset[0];
  if (!match) return res.status(404).json({ message: "Không tìm thấy trận" });
  if (match.ResultLocked) return res.status(400).json({ message: "Kết quả đã niêm phong" });

  const msUntilMatch = new Date(match.MatchDate) - Date.now();
  if (match.IsLocked || msUntilMatch <= 30 * 60 * 1000) {
    return res.status(400).json({ message: "Trận đã bị khóa dự đoán (trước 30 phút)" });
  }

  // Upsert prediction (1 người 1 trận)
  await pool.request()
    .input("userId",  sql.Int,      req.user.id)
    .input("matchId", sql.Int,      matchId)
    .input("choice",  sql.NVarChar, choice)
    .query(`
      IF EXISTS (SELECT 1 FROM Predictions WHERE UserId = @userId AND MatchId = @matchId)
        UPDATE Predictions SET Choice = @choice, CreatedAt = GETUTCDATE()
        WHERE UserId = @userId AND MatchId = @matchId
      ELSE
        INSERT INTO Predictions (UserId, MatchId, Choice) VALUES (@userId, @matchId, @choice)
    `);

  const label = choice === "home" ? "Nhà thắng" : choice === "draw" ? "Hòa" : "Khách thắng";
  res.json({ message: `Dự đoán "${label}" đã lưu ✓` });
}

// ─── Format helper ────────────────────────────────────────────────────────────
function formatPred(p) {
  return {
    id:           p.Id,
    userId:       p.UserId,
    matchId:      p.MatchId,
    choice:       p.Choice,
    createdAt:    p.CreatedAt,
    result: p.Reason ? {
      isCorrect:   !!p.IsCorrect,
      moneyChange: Number(p.MoneyChange),
      reason:      p.Reason,
      calculatedAt:p.CalculatedAt,
    } : null,
  };
}

module.exports = { getMyPredictions, getAllPredictions, predict };
