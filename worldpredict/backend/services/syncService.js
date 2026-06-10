/**
 * syncService.js
 * Tự động fetch dữ liệu WC 2026 từ Zafronix và upsert vào DB.
 * Tích hợp OddsAPI để tự động fetch kèo chấp 2 tiếng trước giờ đấu.
 */

const { getPool } = require("../config/db");

const ZAFRONIX_BASE = "https://api.zafronix.com/fifa/worldcup/v1";
const ODDS_BASE     = "https://api.the-odds-api.com/v4";
const ODDS_SPORT    = "soccer_fifa_world_cup";
const ODDS_MARKET   = "asian_handicaps";     // kèo chấp châu Á
const ODDS_REGION   = "eu";
const HOURS_BEFORE  = 2;                     // fetch kèo trước giờ đấu X tiếng

// ─── helper: map status ───────────────────────────────────────────────────────
function mapStatus(m) {
  if (m.liveMinute != null) {
    if (m.liveMinute === 0)  return "1H";
    if (m.liveMinute <= 45)  return "1H";
    if (m.liveMinute === 46) return "HT";
    if (m.liveMinute <= 90)  return "2H";
    if (m.liveMinute <= 105) return "ET";
    return "ET";
  }
  if (m.homeScore !== null && m.awayScore !== null) {
    if (m.penalties) return "PEN";
    if (m.extraTime) return "AET";
    return "FT";
  }
  return "NS";
}

function mapStageToRound(stage) {
  if (!stage) return "Vòng bảng";
  if (stage.startsWith("group_"))  return "Vòng bảng";
  if (stage === "round_of_32")     return "Vòng 1/16";
  if (stage === "round_of_16")     return "Vòng 1/8";
  if (stage === "quarter_final")   return "Tứ kết";
  if (stage === "semi_final")      return "Bán kết";
  if (stage === "third_place")     return "Tranh hạng 3";
  if (stage === "final")           return "Chung kết";
  return "Vòng bảng";
}

const ISO_MAP = {
  "United States":"us","USA":"us","Mexico":"mx","Canada":"ca",
  "Brazil":"br","Argentina":"ar","Uruguay":"uy","Colombia":"co",
  "Ecuador":"ec","Peru":"pe","Chile":"cl","Paraguay":"py",
  "Panama":"pa","Costa Rica":"cr","Honduras":"hn","Jamaica":"jm",
  "Germany":"de","France":"fr","Spain":"es","England":"gb-eng",
  "Portugal":"pt","Italy":"it","Netherlands":"nl","Belgium":"be",
  "Switzerland":"ch","Croatia":"hr","Serbia":"rs","Austria":"at",
  "Poland":"pl","Czech Republic":"cz","Ukraine":"ua","Turkey":"tr",
  "Morocco":"ma","Senegal":"sn","Nigeria":"ng","Cameroon":"cm",
  "Ghana":"gh","Tunisia":"tn","Egypt":"eg","Algeria":"dz",
  "Japan":"jp","South Korea":"kr","Australia":"au",
  "Saudi Arabia":"sa","Iran":"ir","Qatar":"qa","China":"cn",
  "New Zealand":"nz","Venezuela":"ve","Bolivia":"bo",
  "South Africa":"za","Korea Republic":"kr","Czechia":"cz",
  "Ivory Coast":"ci","DR Congo":"cd","Mali":"ml","Zambia":"zm",
  "Iraq":"iq","Uzbekistan":"uz","Indonesia":"id","Jordan":"jo",
  "Oman":"om","Kuwait":"kw","Thailand":"th","Vietnam":"vn",
  "Trinidad and Tobago":"tt","Cuba":"cu","Guatemala":"gt",
  "El Salvador":"sv","Haiti":"ht","Burkina Faso":"bf","Cape Verde":"cv",
};

function buildFlagUrl(teamName) {
  const iso = ISO_MAP[teamName];
  return iso ? `https://flagcdn.com/w80/${iso}.png` : `https://flagcdn.com/w80/un.png`;
}

// ─── Đảm bảo schema tương thích ──────────────────────────────────────────────
async function ensureSchema(pool) {
  await pool.query(`
    ALTER TABLE matches
      ALTER COLUMN HomeTeamId TYPE VARCHAR(50),
      ALTER COLUMN AwayTeamId TYPE VARCHAR(50)
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE matches ADD COLUMN IF NOT EXISTS FixtureId  VARCHAR(50) UNIQUE
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE matches ADD COLUMN IF NOT EXISTS OddsFetched BOOLEAN DEFAULT FALSE
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE matches ADD COLUMN IF NOT EXISTS UpdatedAt TIMESTAMP DEFAULT NOW()
  `).catch(() => {});
}

// ─── OddsAPI: fetch kèo chấp WC ──────────────────────────────────────────────
async function fetchOdds() {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    console.warn("[OddsSync] ODDS_API_KEY chưa cấu hình — bỏ qua.");
    return [];
  }

  const url = `${ODDS_BASE}/sports/${ODDS_SPORT}/odds?apiKey=${apiKey}&regions=${ODDS_REGION}&markets=${ODDS_MARKET}&oddsFormat=decimal`;

  const res = await fetch(url);

  if (res.status === 401) {
    console.error("[OddsSync] API key không hợp lệ.");
    return [];
  }
  if (res.status === 429) {
    console.warn("[OddsSync] Rate limit OddsAPI — bỏ qua lần này.");
    return [];
  }
  if (!res.ok) {
    console.error("[OddsSync] Lỗi OddsAPI:", res.status);
    return [];
  }

  const remaining = res.headers.get("x-requests-remaining");
  if (remaining) console.log(`[OddsSync] Quota còn: ${remaining} requests`);

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// ─── Parse handicap từ OddsAPI outcome name ───────────────────────────────────
// OddsAPI trả outcome dạng: { name: "Mexico", point: -0.5 }
// point âm = đội đó chấp, dương = đội đó nhận
function parseHandicap(oddsEvent, homeTeamName) {
  try {
    const bookmaker = oddsEvent.bookmakers?.[0];
    if (!bookmaker) return null;

    const market = bookmaker.markets?.find(mk => mk.key === ODDS_MARKET);
    if (!market) return null;

    const homeOutcome = market.outcomes?.find(o =>
      o.name.toLowerCase().includes(homeTeamName.toLowerCase().split(" ")[0])
    );
    if (!homeOutcome) return null;

    // point = handicap từ góc nhìn đội nhà
    // VD: Mexico -0.5 → handicap = -0.5 (Mexico chấp 0.5)
    return homeOutcome.point ?? null;
  } catch {
    return null;
  }
}

// ─── So khớp tên đội giữa Zafronix và OddsAPI ────────────────────────────────
function teamsMatch(zafName, oddsName) {
  const normalize = s => s.toLowerCase()
    .replace(/[^a-z]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const z = normalize(zafName);
  const o = normalize(oddsName);

  // Khớp chính xác
  if (z === o) return true;

  // Khớp 1 từ đầu tiên (VD: "Mexico" vs "Mexico City")
  const zFirst = z.split(" ")[0];
  const oFirst = o.split(" ")[0];
  if (zFirst.length > 3 && oFirst.length > 3 && zFirst === oFirst) return true;

  // Khớp một bên chứa bên kia
  if (z.includes(o) || o.includes(z)) return true;

  return false;
}

// ─── Cập nhật handicap vào DB cho các trận sắp đấu trong 2 tiếng ─────────────
async function syncHandicaps(pool, matches) {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return 0;

  const now = Date.now();
  const twoHoursMs = HOURS_BEFORE * 60 * 60 * 1000;

  // Lọc trận NS (chưa đấu), chưa fetch kèo, trong vòng 2 tiếng tới
  const upcoming = matches.filter(m => {
    const status = mapStatus(m);
    if (status !== "NS") return false;

    const matchTime = new Date(`${m.date}T${m.kickoff || "00:00"}:00Z`).getTime();
    const diff = matchTime - now;
    return diff > 0 && diff <= twoHoursMs;
  });

  if (!upcoming.length) return 0;

  console.log(`[OddsSync] Có ${upcoming.length} trận sắp đấu trong ${HOURS_BEFORE}h — fetch kèo...`);

  const oddsData = await fetchOdds();
  if (!oddsData.length) return 0;

  let updated = 0;

  for (const m of upcoming) {
    const fixtureId = String(m.id);

    // Tìm event khớp trong OddsAPI
    const oddsEvent = oddsData.find(ev =>
      teamsMatch(m.homeTeam, ev.home_team) &&
      teamsMatch(m.awayTeam, ev.away_team)
    );

    if (!oddsEvent) {
      console.log(`[OddsSync] Không tìm thấy kèo: ${m.homeTeam} vs ${m.awayTeam}`);
      continue;
    }

    const handicap = parseHandicap(oddsEvent, m.homeTeam);
    if (handicap === null) {
      console.log(`[OddsSync] Không parse được handicap: ${m.homeTeam} vs ${m.awayTeam}`);
      continue;
    }

    await pool.query(
      `UPDATE matches SET Handicap = $1, OddsFetched = TRUE, UpdatedAt = NOW()
       WHERE FixtureId = $2 AND (OddsFetched = FALSE OR OddsFetched IS NULL)`,
      [handicap, fixtureId]
    );

    console.log(`[OddsSync] ✅ Kèo ${m.homeTeam} vs ${m.awayTeam}: handicap = ${handicap}`);
    updated++;
  }

  return updated;
}

// ─── Tự động tính điểm khi trận kết thúc (FT/AET/PEN) ───────────────────────
async function resolveFinishedMatches(pool, matches) {
  const finished = matches.filter(m => {
    const status = mapStatus(m);
    return (status === "FT" || status === "AET" || status === "PEN")
      && m.homeScore !== null && m.awayScore !== null;
  });

  if (!finished.length) return;

  for (const m of finished) {
    const fixtureId = String(m.id);

    // Đánh dấu match đã có kết quả để trigger tính điểm
    await pool.query(
      `UPDATE matches SET
         Status    = $1,
         HomeGoals = $2,
         AwayGoals = $3,
         UpdatedAt = NOW()
       WHERE FixtureId = $4
         AND (Status != $1 OR HomeGoals IS DISTINCT FROM $2 OR AwayGoals IS DISTINCT FROM $3)`,
      [mapStatus(m), m.homeScore, m.awayScore, fixtureId]
    );
  }
}

// ─── core sync logic ──────────────────────────────────────────────────────────
async function fetchAndSync() {
  const apiKey = process.env.ZAFRONIX_API_KEY;
  if (!apiKey) {
    console.warn("[SyncService] ZAFRONIX_API_KEY chưa cấu hình — bỏ qua sync.");
    return { synced: 0, error: "No API key" };
  }

  console.log("[SyncService] Đang fetch Zafronix WC 2026...");

  const url = `${ZAFRONIX_BASE}/matches?year=2026`;
  const response = await fetch(url, { headers: { "X-API-Key": apiKey } });

  if (response.status === 429) {
    console.warn("[SyncService] Zafronix rate limit — thử lại sau.");
    return { synced: 0, error: "rate_limit" };
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error("[SyncService] Lỗi Zafronix:", err.message || response.status);
    return { synced: 0, error: err.message || response.status };
  }

  const data = await response.json();
  const remaining = response.headers.get("X-RateLimit-Remaining");
  if (remaining) console.log(`[SyncService] Quota còn: ${remaining}`);

  const matches = data.data || [];
  if (!matches.length) {
    console.log("[SyncService] Không có trận nào từ Zafronix.");
    return { synced: 0 };
  }

  const pool = await getPool();
  await ensureSchema(pool);

  let synced = 0;

  for (const m of matches) {
    const fixtureId = String(m.id);
    const matchDate = `${m.date}T${m.kickoff || "00:00"}:00Z`;
    const status    = mapStatus(m);
    const round     = mapStageToRound(m.stageNormalized || m.stage);
    const homeTeam  = m.homeTeam;
    const awayTeam  = m.awayTeam;
    const homeLogo  = buildFlagUrl(homeTeam);
    const awayLogo  = buildFlagUrl(awayTeam);
    const homeGoals = m.homeScore ?? null;
    const awayGoals = m.awayScore ?? null;
    const stadium   = m.stadium  ?? null;
    const city      = m.city     ?? null;

    await pool.query(
      `INSERT INTO matches
         (HomeTeamId, HomeTeamName, HomeTeamLogo,
          AwayTeamId, AwayTeamName, AwayTeamLogo,
          MatchDate, Round, Status,
          HomeGoals, AwayGoals, Stadium, City, FixtureId)
       VALUES ($1,$2,$3, $4,$5,$6, $7,$8,$9, $10,$11,$12,$13,$14)
       ON CONFLICT (FixtureId) DO UPDATE SET
         Status     = EXCLUDED.Status,
         HomeGoals  = EXCLUDED.HomeGoals,
         AwayGoals  = EXCLUDED.AwayGoals,
         MatchDate  = EXCLUDED.MatchDate,
         Stadium    = EXCLUDED.Stadium,
         City       = EXCLUDED.City,
         UpdatedAt  = NOW()`,
      [
        fixtureId,           homeTeam, homeLogo,
        fixtureId + "_away", awayTeam, awayLogo,
        matchDate, round, status,
        homeGoals, awayGoals, stadium, city, fixtureId,
      ]
    );
    synced++;
  }

  console.log(`[SyncService] ✅ Đã sync ${synced} trận vào DB.`);

  // Fetch kèo cho trận sắp đấu trong 2 tiếng
  const handicapUpdated = await syncHandicaps(pool, matches);
  if (handicapUpdated > 0) {
    console.log(`[SyncService] ✅ Đã cập nhật kèo cho ${handicapUpdated} trận.`);
  }

  // Tự động resolve kết quả
  await resolveFinishedMatches(pool, matches);

  const liveCount = matches.filter(m => m.liveMinute != null).length;
  if (liveCount > 0) console.log(`[SyncService] 🔴 Đang có ${liveCount} trận LIVE`);

  return { synced, liveCount, handicapUpdated };
}

// ─── scheduler ───────────────────────────────────────────────────────────────
let _timer = null;

function startSyncService() {
  const intervalSec     = parseInt(process.env.SYNC_INTERVAL_SEC)      || 300;
  const liveIntervalSec = parseInt(process.env.SYNC_LIVE_INTERVAL_SEC) || 60;

  console.log(`[SyncService] Khởi động — bình thường: ${intervalSec}s | live: ${liveIntervalSec}s`);

  let currentInterval = intervalSec;

  async function runSync() {
    try {
      const result = await fetchAndSync();
      const hasLive = result.liveCount > 0;
      const nextSec = hasLive ? liveIntervalSec : intervalSec;

      if (nextSec !== currentInterval) {
        currentInterval = nextSec;
        clearInterval(_timer);
        _timer = setInterval(runSync, currentInterval * 1000);
        if (_timer.unref) _timer.unref();
        console.log(`[SyncService] Chuyển interval → ${currentInterval}s (live: ${hasLive})`);
      }
    } catch (err) {
      console.error("[SyncService] Lỗi sync định kỳ:", err);
    }
  }

  runSync();

  _timer = setInterval(runSync, currentInterval * 1000);
  if (_timer.unref) _timer.unref();
}

function stopSyncService() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    console.log("[SyncService] Đã dừng.");
  }
}

module.exports = { startSyncService, stopSyncService, fetchAndSync };