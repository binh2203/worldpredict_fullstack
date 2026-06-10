const { getPool } = require("../config/db");

// GET /api/matches
async function getMatches(req, res) {
  const pool = await getPool();
  const result = await pool.query(`
    SELECT
      m.Id,
      m.HomeTeamId,  m.HomeTeamName,  m.HomeTeamLogo,
      m.AwayTeamId,  m.AwayTeamName,  m.AwayTeamLogo,
      m.MatchDate, m.Round, m.Status,
      m.HomeGoals, m.AwayGoals, m.Handicap,
      m.IsLocked, m.LockedAt,
      m.ResultLocked, m.ResultSetAt, m.ResultSetBy
    FROM matches m
    ORDER BY m.MatchDate ASC
  `);
  res.json(result.rows.map(formatMatch));
}

// PUT /api/matches/:id/handicap (admin)
async function setHandicap(req, res) {
  const { id } = req.params;
  const { handicap } = req.body;

  const pool = await getPool();
  const check = await pool.query(
    "SELECT IsLocked, ResultLocked FROM Matches WHERE Id = $1",
    [id]
  );
  const m = check.rows[0];
  if (!m)             return res.status(404).json({ message: "Không tìm thấy trận" });
  if (m.resultlocked) return res.status(400).json({ message: "Kết quả đã niêm phong" });
  if (m.islocked)     return res.status(400).json({ message: "Trận đã khóa, không thể sửa kèo" });

  const h = (handicap === null || handicap === "") ? null : parseFloat(handicap);
  await pool.query(
    "UPDATE matches SET Handicap = $1 WHERE Id = $2",
    [h, id]
  );

  res.json({ message: h === null ? "Đã bỏ kèo chấp" : `Kèo chấp: ${h}` });
}

// POST /api/matches/:id/result (admin) — gọi function sp_set_match_result
async function setResult(req, res) {
  const { id } = req.params;
  const { homeGoals, awayGoals } = req.body;

  if (homeGoals == null || awayGoals == null || homeGoals < 0 || awayGoals < 0)
    return res.status(400).json({ message: "Tỷ số không hợp lệ" });

  const pool = await getPool();
  await pool.query(
    "SELECT sp_set_match_result($1, $2, $3, $4)",
    [parseInt(id), parseInt(homeGoals), parseInt(awayGoals), req.user.id]
  );

  res.json({ message: "Kết quả đã lưu và niêm phong vĩnh viễn" });
}

// POST /api/matches/auto-lock (admin)
async function autoLock(req, res) {
  const pool = await getPool();
  await pool.query("SELECT sp_auto_lock_matches()");
  res.json({ message: "Auto-lock hoàn tất" });
}

function formatMatch(m) {
  return {
    id:           m.id,
    homeTeam:     { id: m.hometeamid, name: m.hometeamname, logo: m.hometeamlogo },
    awayTeam:     { id: m.awayteamid, name: m.awayteamname, logo: m.awayteamlogo },
    matchDate:    m.matchdate ? new Date(m.matchdate).toISOString() : null,
    round:        m.round,
    status:       m.status,
    homeGoals:    m.homegoals,
    awayGoals:    m.awaygoals,
    handicap:     m.handicap,
    isLocked:     !!m.islocked,
    lockedAt:     m.lockedat,
    resultLocked: !!m.resultlocked,
    resultSetAt:  m.resultsetat,
    resultSetBy:  m.resultsetby,
  };
}

module.exports = { getMatches, setHandicap, setResult, autoLock };
