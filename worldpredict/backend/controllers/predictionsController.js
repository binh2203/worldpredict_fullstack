const { query } = require("../config/db");

// ─── GET /api/predictions/my ─────────────────────────────────────
async function getMyPredictions(req, res) {
  try {
    const result = await query(
      `
      SELECT
        p.id,
        p.user_id,
        p.match_id,
        p.choice,
        p.created_at,
        pr.is_correct,
        pr.money_change,
        pr.reason,
        pr.calculated_at
      FROM predictions p
      LEFT JOIN prediction_results pr
        ON pr.prediction_id = p.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows.map(formatPred));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── GET /api/predictions/all (admin) ───────────────────────────
async function getAllPredictions(req, res) {
  try {
    const result = await query(
      `
      SELECT
        p.id,
        p.user_id,
        p.match_id,
        p.choice,
        p.created_at,
        u.full_name AS user_name,
        pr.is_correct,
        pr.money_change,
        pr.reason
      FROM predictions p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN prediction_results pr
        ON pr.prediction_id = p.id
      ORDER BY p.created_at DESC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── POST /api/predictions ──────────────────────────────────────
async function predict(req, res) {
  const { matchId, choice } = req.body;

  if (
    !matchId ||
    !["home", "draw", "away"].includes(choice)
  ) {
    return res.status(400).json({
      message: "Dữ liệu dự đoán không hợp lệ",
    });
  }

  try {
    // ── Check match ───────────────────────────────
    const matchResult = await query(
      `
      SELECT is_locked, result_locked, match_date
      FROM matches
      WHERE id = $1
      `,
      [matchId]
    );

    const match = matchResult.rows[0];

    if (!match) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy trận" });
    }

    if (match.result_locked) {
      return res.status(400).json({
        message: "Kết quả đã niêm phong",
      });
    }

    const msUntilMatch =
      new Date(match.match_date) - Date.now();

    if (
      match.is_locked ||
      msUntilMatch <= 30 * 60 * 1000
    ) {
      return res.status(400).json({
        message:
          "Trận đã bị khóa dự đoán (trước 30 phút)",
      });
    }

    // ── UPSERT (1 user 1 match) ───────────────────
    await query(
      `
      INSERT INTO predictions (
        user_id,
        match_id,
        choice,
        created_at
      )
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, match_id)
      DO UPDATE SET
        choice = EXCLUDED.choice,
        created_at = NOW()
      `,
      [req.user.id, matchId, choice]
    );

    const label =
      choice === "home"
        ? "Nhà thắng"
        : choice === "draw"
        ? "Hòa"
        : "Khách thắng";

    res.json({
      message: `Dự đoán "${label}" đã lưu ✓`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── FORMAT RESPONSE ─────────────────────────────────────────────
function formatPred(p) {
  return {
    id: p.id,
    userId: p.user_id,
    matchId: p.match_id,
    choice: p.choice,
    createdAt: p.created_at,
    result: p.reason
      ? {
          isCorrect: !!p.is_correct,
          moneyChange: Number(p.money_change),
          reason: p.reason,
          calculatedAt: p.calculated_at,
        }
      : null,
  };
}

module.exports = {
  getMyPredictions,
  getAllPredictions,
  predict,
};