const { query } = require("../config/db");

// ─── GET /api/matches ─────────────────────────────────────────────
async function getMatches(req, res) {
  try {
    const result = await query(`
      SELECT
        m.id,
        m.home_team_id,
        ht.name AS home_team_name,
        ht.logo AS home_team_logo,
        m.away_team_id,
        at.name AS away_team_name,
        at.logo AS away_team_logo,
        m.match_date,
        m.round,
        m.status,
        m.home_goals,
        m.away_goals,
        m.handicap,
        m.is_locked,
        m.locked_at,
        m.result_locked,
        m.result_set_at,
        m.result_set_by
      FROM matches m
      JOIN teams ht ON ht.id = m.home_team_id
      JOIN teams at ON at.id = m.away_team_id
      ORDER BY m.match_date ASC
    `);

    res.json(result.rows.map(formatMatch));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── PUT /api/matches/:id/handicap ───────────────────────────────
async function setHandicap(req, res) {
  const { id } = req.params;
  const { handicap } = req.body;

  try {
    const check = await query(
      `SELECT is_locked, result_locked FROM matches WHERE id = $1`,
      [id]
    );

    const m = check.rows[0];

    if (!m) {
      return res.status(404).json({ message: "Không tìm thấy trận" });
    }

    if (m.result_locked) {
      return res.status(400).json({ message: "Kết quả đã niêm phong" });
    }

    if (m.is_locked) {
      return res.status(400).json({ message: "Trận đã khóa, không thể sửa kèo" });
    }

    const h =
      handicap === null || handicap === ""
        ? null
        : parseFloat(handicap);

    await query(
      `UPDATE matches SET handicap = $1 WHERE id = $2`,
      [h, id]
    );

    res.json({
      message:
        h === null ? "Đã bỏ kèo chấp" : `Kèo chấp: ${h}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── POST /api/matches/:id/result ────────────────────────────────
async function setResult(req, res) {
  const { id } = req.params;
  const { homeGoals, awayGoals } = req.body;

  if (
    homeGoals == null ||
    awayGoals == null ||
    homeGoals < 0 ||
    awayGoals < 0
  ) {
    return res.status(400).json({ message: "Tỷ số không hợp lệ" });
  }

  try {
    await query(
      `
      SELECT sp_set_match_result($1, $2, $3, $4)
      `,
      [
        id,
        parseInt(homeGoals),
        parseInt(awayGoals),
        req.user.id,
      ]
    );

    res.json({
      message: "Kết quả đã lưu và niêm phong vĩnh viễn",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── POST /api/matches/auto-lock ──────────────────────────────────
async function autoLock(req, res) {
  try {
    await query(`SELECT sp_auto_lock_matches()`);
    res.json({ message: "Auto-lock hoàn tất" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── FORMAT RESPONSE ──────────────────────────────────────────────
function formatMatch(m) {
  return {
    id: m.id,
    homeTeam: {
      id: m.home_team_id,
      name: m.home_team_name,
      logo: m.home_team_logo,
    },
    awayTeam: {
      id: m.away_team_id,
      name: m.away_team_name,
      logo: m.away_team_logo,
    },
    matchDate: m.match_date,
    round: m.round,
    status: m.status,
    homeGoals: m.home_goals,
    awayGoals: m.away_goals,
    handicap: m.handicap,
    isLocked: !!m.is_locked,
    lockedAt: m.locked_at,
    resultLocked: !!m.result_locked,
    resultSetAt: m.result_set_at,
    resultSetBy: m.result_set_by,
  };
}

module.exports = {
  getMatches,
  setHandicap,
  setResult,
  autoLock,
};