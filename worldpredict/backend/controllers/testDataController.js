/**
 * testDataController.js
 * Lấy fixtures hôm nay & ngày mai từ API-Football (api-football.com)
 * để dùng làm dữ liệu test.
 *
 * Endpoint:
 *   GET /api/test-data/fixtures?days=today|tomorrow|both   (mặc định: both)
 *   GET /api/test-data/live                                 (trận đang live)
 */

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

// ─── helper ───────────────────────────────────────────────────────────────────
function getDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

function formatFixture(f) {
  return {
    fixtureId:  f.fixture.id,
    matchDate:  f.fixture.date,
    status:     f.fixture.status.short,   // NS, 1H, HT, 2H, FT, ...
    statusLong: f.fixture.status.long,
    elapsed:    f.fixture.status.elapsed,
    venue:      f.fixture.venue?.name ?? null,
    city:       f.fixture.venue?.city ?? null,
    league: {
      id:      f.league.id,
      name:    f.league.name,
      country: f.league.country,
      logo:    f.league.logo,
      round:   f.league.round,
    },
    homeTeam: {
      id:   f.teams.home.id,
      name: f.teams.home.name,
      logo: f.teams.home.logo,
      winner: f.teams.home.winner,
    },
    awayTeam: {
      id:   f.teams.away.id,
      name: f.teams.away.name,
      logo: f.teams.away.logo,
      winner: f.teams.away.winner,
    },
    homeGoals: f.goals.home,
    awayGoals: f.goals.away,
    score: {
      halftime:  f.score.halftime,
      fulltime:  f.score.fulltime,
      extratime: f.score.extratime,
      penalty:   f.score.penalty,
    },
  };
}

async function apiFetch(path, apiKey) {
  const url = `${API_FOOTBALL_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      "x-apisports-key": apiKey,
      "x-rapidapi-key":  apiKey,   // hỗ trợ cả RapidAPI host
    },
  });

  if (res.status === 429) {
    throw Object.assign(new Error("Rate limit API-Football"), { status: 429 });
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(
      new Error(body.message || `HTTP ${res.status}`),
      { status: res.status }
    );
  }

  const json = await res.json();

  // API-Football trả lỗi trong body khi status 200
  if (json.errors && Object.keys(json.errors).length > 0) {
    const msg = Object.values(json.errors)[0];
    throw Object.assign(new Error(msg), { status: 400 });
  }

  const remaining = res.headers.get("x-ratelimit-requests-remaining");
  if (remaining !== null) {
    console.log(`[TestData] API-Football quota còn: ${remaining}`);
  }

  return json.response || [];
}

// ─── controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/test-data/fixtures?days=today|tomorrow|both&league=<id>
 * Lấy fixtures hôm nay và/hoặc ngày mai.
 * Nếu có ?league= thì filter theo league_id (VD: 1 = World Cup).
 */
async function getTestFixtures(req, res) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: "API_FOOTBALL_KEY chưa cấu hình" });
  }

  const daysParam   = req.query.days    || "both";   // today | tomorrow | both
  const leagueId    = req.query.league  || null;
  const timezone    = req.query.tz      || "Asia/Ho_Chi_Minh";

  try {
    const fetches = [];

    if (daysParam === "today" || daysParam === "both") {
      const date = getDateString(0);
      let path = `/fixtures?date=${date}&timezone=${encodeURIComponent(timezone)}`;
      if (leagueId) path += `&league=${leagueId}&season=2026`;
      fetches.push(
        apiFetch(path, apiKey).then(rows => rows.map(f => ({ ...formatFixture(f), _day: "today" })))
      );
    }

    if (daysParam === "tomorrow" || daysParam === "both") {
      const date = getDateString(1);
      let path = `/fixtures?date=${date}&timezone=${encodeURIComponent(timezone)}`;
      if (leagueId) path += `&league=${leagueId}&season=2026`;
      fetches.push(
        apiFetch(path, apiKey).then(rows => rows.map(f => ({ ...formatFixture(f), _day: "tomorrow" })))
      );
    }

    const results   = await Promise.all(fetches);
    const fixtures  = results.flat();

    const today    = fixtures.filter(f => f._day === "today");
    const tomorrow = fixtures.filter(f => f._day === "tomorrow");

    // Sắp xếp theo giờ
    const sort = arr => arr.sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));

    res.json({
      fetchedAt: new Date().toISOString(),
      timezone,
      today:    sort(today),
      tomorrow: sort(tomorrow),
      total:    fixtures.length,
    });
  } catch (err) {
    console.error("[TestData] Lỗi fetch fixtures:", err.message);
    res.status(err.status || 502).json({ message: err.message });
  }
}

/**
 * GET /api/test-data/live
 * Lấy tất cả trận đang live ngay lúc gọi.
 */
async function getLiveFixtures(req, res) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: "API_FOOTBALL_KEY chưa cấu hình" });
  }

  try {
    const raw = await apiFetch("/fixtures?live=all", apiKey);
    const fixtures = raw.map(formatFixture);

    res.json({
      fetchedAt: new Date().toISOString(),
      count: fixtures.length,
      fixtures,
    });
  } catch (err) {
    console.error("[TestData] Lỗi fetch live:", err.message);
    res.status(err.status || 502).json({ message: err.message });
  }
}

/**
 * GET /api/test-data/leagues?search=<name>
 * Tiện ích: tìm league_id để dùng làm param cho /fixtures
 */
async function searchLeagues(req, res) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return res.status(503).json({ message: "API_FOOTBALL_KEY chưa cấu hình" });

  const { search } = req.query;
  if (!search) return res.status(400).json({ message: "Thiếu ?search=" });

  try {
    const raw = await apiFetch(`/leagues?search=${encodeURIComponent(search)}`, apiKey);
    const leagues = raw.map(l => ({
      id:      l.league.id,
      name:    l.league.name,
      type:    l.league.type,
      logo:    l.league.logo,
      country: l.country.name,
    }));
    res.json({ count: leagues.length, leagues });
  } catch (err) {
    res.status(err.status || 502).json({ message: err.message });
  }
}

/**
 * GET /api/test-data/today-wc
 * Lấy tối đa 2 trận WC hôm nay (theo UTC+7) từ DB để test logic web.
 * Nếu DB chưa có → mock 2 trận giả để frontend vẫn chạy được.
 */
async function getTodayWcMatches(req, res) {
  const { getPool } = require("../config/db");

  // Tính start/end của ngày hôm nay theo UTC+7, convert sang UTC để query DB
  const nowUtc    = new Date();
  const vn7       = 7 * 60 * 60 * 1000;                      // UTC+7 offset in ms
  const todayVN   = new Date(nowUtc.getTime() + vn7);        // "hôm nay" ở VN
  const yyyy      = todayVN.getUTCFullYear();
  const mm        = String(todayVN.getUTCMonth() + 1).padStart(2, "0");
  const dd        = String(todayVN.getUTCDate()).padStart(2, "0");
  const dayStart  = new Date(`${yyyy}-${mm}-${dd}T00:00:00+07:00`); // 00:00 VN → UTC
  const dayEnd    = new Date(`${yyyy}-${mm}-${dd}T23:59:59+07:00`); // 23:59 VN → UTC

  let matches = [];

  try {
    const pool = await getPool();
    const result = await pool.query(
      `SELECT
         m.Id            AS id,
         m.HomeTeamName  AS hometeamname,
         m.HomeTeamLogo  AS hometeamlogo,
         m.AwayTeamName  AS awayteamname,
         m.AwayTeamLogo  AS awayteamlogo,
         m.MatchDate     AS matchdate,
         m.Round         AS round,
         m.Status        AS status,
         m.HomeGoals     AS homegoals,
         m.AwayGoals     AS awaygoals,
         m.Handicap      AS handicap,
         m.IsLocked      AS islocked,
         m.ResultLocked  AS resultlocked,
         m.Stadium       AS stadium,
         m.City          AS city
       FROM matches m
       WHERE m.MatchDate >= $1 AND m.MatchDate <= $2
       ORDER BY m.MatchDate ASC
       LIMIT 2`,
      [dayStart.toISOString(), dayEnd.toISOString()]
    );
    matches = result.rows;
  } catch (dbErr) {
    console.warn("[TestData] DB query lỗi, dùng mock data:", dbErr.message);
  }

  // Nếu DB không có trận nào hôm nay → tạo 2 trận mock để frontend test được
  if (matches.length === 0) {
    const baseTime = new Date(dayStart.getTime() + 19 * 3600 * 1000); // 19:00 VN
    matches = [
      {
        id: 9001,
        hometeamname: "Brazil",
        hometeamlogo: "https://flagcdn.com/w80/br.png",
        awayteamname: "Argentina",
        awayteamlogo: "https://flagcdn.com/w80/ar.png",
        matchdate: new Date(baseTime).toISOString(),
        round: "Vòng bảng",
        status: "NS",
        homegoals: null, awaygoals: null,
        handicap: null, islocked: false, resultlocked: false,
        stadium: "MetLife Stadium", city: "New York",
        _isMock: true,
      },
      {
        id: 9002,
        hometeamname: "France",
        hometeamlogo: "https://flagcdn.com/w80/fr.png",
        awayteamname: "Spain",
        awayteamlogo: "https://flagcdn.com/w80/es.png",
        matchdate: new Date(baseTime.getTime() + 2 * 3600 * 1000).toISOString(), // +2h
        round: "Vòng bảng",
        status: "NS",
        homegoals: null, awaygoals: null,
        handicap: null, islocked: false, resultlocked: false,
        stadium: "SoFi Stadium", city: "Los Angeles",
        _isMock: true,
      },
    ];
  }

  // Format trả về giống với getMatches (frontend dùng chung MatchCard)
  const formatted = matches.map(m => ({
    id:           m.id,
    homeTeam:     { id: m.hometeamid || m.id, name: m.hometeamname, logo: m.hometeamlogo },
    awayTeam:     { id: m.awayteamid || m.id, name: m.awayteamname, logo: m.awayteamlogo },
    matchDate:    m.matchdate ? new Date(m.matchdate).toISOString() : null,
    round:        m.round,
    status:       m.status,
    homeGoals:    m.homegoals,
    awayGoals:    m.awaygoals,
    handicap:     m.handicap,
    isLocked:     !!m.islocked,
    resultLocked: !!m.resultlocked,
    stadium:      m.stadium,
    city:         m.city,
    _isMock:      m._isMock || false,
  }));

  res.json({
    fetchedAt: new Date().toISOString(),
    todayVN:   `${yyyy}-${mm}-${dd}`,     // ngày hôm nay giờ VN
    count:     formatted.length,
    isMock:    formatted.some(m => m._isMock),
    matches:   formatted,
  });
}

module.exports = { getTestFixtures, getLiveFixtures, searchLeagues, getTodayWcMatches };
