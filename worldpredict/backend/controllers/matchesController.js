const { getPool, sql } = require("../config/db");

// GET /api/matches
async function getMatches(req, res) {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      m.Id,
      m.HomeTeamId,  ht.Name AS HomeTeamName,  ht.Logo AS HomeTeamLogo,
      m.AwayTeamId,  at.Name AS AwayTeamName,  at.Logo AS AwayTeamLogo,
      m.MatchDate, m.Round, m.Status,
      m.HomeGoals, m.AwayGoals, m.Handicap,
      m.IsLocked, m.LockedAt,
      m.ResultLocked, m.ResultSetAt, m.ResultSetBy
    FROM Matches m
    JOIN Teams ht ON ht.Id = m.HomeTeamId
    JOIN Teams at ON at.Id = m.AwayTeamId
    ORDER BY m.MatchDate ASC
  `);
  res.json(result.recordset.map(formatMatch));
}

// PUT /api/matches/:id/handicap  (admin)
async function setHandicap(req, res) {
  const { id } = req.params;
  const { handicap } = req.body;

  const pool = await getPool();
  const check = await pool.request()
    .input("id", sql.BigInt, id)
    .query("SELECT IsLocked, ResultLocked FROM Matches WHERE Id = @id");
  const m = check.recordset[0];
  if (!m)             return res.status(404).json({ message: "Không tìm thấy trận" });
  if (m.ResultLocked) return res.status(400).json({ message: "Kết quả đã niêm phong" });
  if (m.IsLocked)     return res.status(400).json({ message: "Trận đã khóa, không thể sửa kèo" });

  const h = (handicap === null || handicap === "") ? null : parseFloat(handicap);
  await pool.request()
    .input("id",       sql.BigInt, id)
    .input("handicap", sql.Decimal(4,2), h)
    .query("UPDATE Matches SET Handicap = @handicap WHERE Id = @id");

  res.json({ message: h === null ? "Đã bỏ kèo chấp" : `Kèo chấp: ${h}` });
}

// POST /api/matches/:id/result  (admin) — gọi sp_SetMatchResult
async function setResult(req, res) {
  const { id } = req.params;
  const { homeGoals, awayGoals } = req.body;

  if (homeGoals == null || awayGoals == null || homeGoals < 0 || awayGoals < 0)
    return res.status(400).json({ message: "Tỷ số không hợp lệ" });

  const pool = await getPool();
  await pool.request()
    .input("MatchId",   sql.BigInt, id)
    .input("HomeGoals", sql.Int,    parseInt(homeGoals))
    .input("AwayGoals", sql.Int,    parseInt(awayGoals))
    .input("AdminId",   sql.BigInt, req.user.id)
    .execute("sp_SetMatchResult");

  res.json({ message: "Kết quả đã lưu và niêm phong vĩnh viễn" });
}

// POST /api/matches/auto-lock  (admin)
async function autoLock(req, res) {
  const pool = await getPool();
  await pool.request().execute("sp_AutoLockMatches");
  res.json({ message: "Auto-lock hoàn tất" });
}

function formatMatch(m) {
  return {
    id:           m.Id,
    homeTeam:     { id: m.HomeTeamId, name: m.HomeTeamName, logo: m.HomeTeamLogo },
    awayTeam:     { id: m.AwayTeamId, name: m.AwayTeamName, logo: m.AwayTeamLogo },
    matchDate:    m.MatchDate,
    round:        m.Round,
    status:       m.Status,
    homeGoals:    m.HomeGoals,
    awayGoals:    m.AwayGoals,
    handicap:     m.Handicap,
    isLocked:     !!m.IsLocked,
    lockedAt:     m.LockedAt,
    resultLocked: !!m.ResultLocked,
    resultSetAt:  m.ResultSetAt,
    resultSetBy:  m.ResultSetBy,
  };
}

module.exports = { getMatches, setHandicap, setResult, autoLock };
