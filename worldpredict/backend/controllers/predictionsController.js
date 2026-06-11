const { getPool } = require("../config/db");

// GET /api/predictions/my
async function getMyPredictions(req, res) {
  const pool = await getPool();
  const result = await pool.query(`
    SELECT
      p.Id, p.UserId, p.MatchId, p.Choice, p.CreatedAt,
      pr.IsCorrect, pr.PointChange, pr.Reason, pr.CalculatedAt
    FROM predictions p
    LEFT JOIN PredictionResults pr ON pr.PredictionId = p.Id AND pr.UserId = p.UserId
    WHERE p.UserId = $1
    ORDER BY p.CreatedAt DESC
  `, [req.user.id]);
  res.json(result.rows.map(formatPred));
}

// GET /api/predictions/all (admin only)
async function getAllPredictions(req, res) {
  const pool = await getPool();
  const result = await pool.query(`
    SELECT
      p.Id, p.UserId, p.MatchId, p.Choice, p.CreatedAt,
      u.FullName AS UserName,
      pr.IsCorrect, pr.PointChange, pr.Reason
    FROM predictions p
    JOIN Users u ON u.Id = p.UserId
    LEFT JOIN PredictionResults pr ON pr.PredictionId = p.Id
    ORDER BY p.CreatedAt DESC
  `);
  res.json(result.rows);
}

// POST /api/predictions
async function predict(req, res) {
  const { matchId, choice } = req.body;
  if (!matchId || !["home", "away"].includes(choice)) {
    return res.status(400).json({ message: "Dữ liệu dự đoán không hợp lệ" });
  }

  const pool = await getPool();

  // Guard: kiểm tra trận có bị khóa không
  const matchResult = await pool.query(
    "SELECT IsLocked, ResultLocked, MatchDate FROM matches WHERE Id = $1",
    [matchId]
  );
  const match = matchResult.rows[0];
  if (!match)          return res.status(404).json({ message: "Không tìm thấy trận" });
  if (match.resultlocked) return res.status(400).json({ message: "Kết quả đã niêm phong" });

  const msUntilMatch = new Date(match.matchdate) - Date.now();
  if (match.islocked || msUntilMatch <= 10 * 60 * 1000) {
    return res.status(400).json({ message: "Trận đã bị khóa dự đoán (trước 10 phút)" });
  }
  console.log("Predict:", {
    userId: req.user.id,
    matchId,
    choice
  });
  // Upsert prediction
  await pool.query(`
    INSERT INTO predictions (UserId, MatchId, Choice)
    VALUES ($1, $2, $3)
    ON CONFLICT (UserId, MatchId)
    DO UPDATE SET Choice = EXCLUDED.Choice, CreatedAt = NOW()
  `, [req.user.id, matchId, choice]);
  const result = await pool.query(`
    INSERT INTO predictions (UserId, MatchId, Choice)
    VALUES ($1, $2, $3)
    ON CONFLICT (UserId, MatchId)
    DO UPDATE SET Choice = EXCLUDED.Choice, CreatedAt = NOW()
    RETURNING *
  `, [req.user.id, matchId, choice]);

  console.log(result.rows);
  const label = choice === "home" ? "Nhà thắng" : "Khách thắng";
  res.json({ message: `Dự đoán "${label}" đã lưu ✓` });
}

function formatPred(p) {
  return {
    id:        p.id,
    userId:    p.userid,
    matchId:   p.matchid,
    choice:    p.choice,
    createdAt: p.createdat,
    result: p.reason ? {
      isCorrect:   !!p.iscorrect,
      pointChange: Number(p.pointchange),
      reason:      p.reason,
      calculatedAt:p.calculatedat,
    } : null,
  };
}

module.exports = { getMyPredictions, getAllPredictions, predict };
