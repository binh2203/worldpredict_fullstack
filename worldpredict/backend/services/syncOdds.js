/**
 * syncOdds.js — Kéo kèo chấp (Asian Handicap) từ The Odds API
 * về DB, chỉ update trận chưa khóa & chưa có kết quả.
 *
 * Docs: https://the-odds-api.com/lol-api/
 * Sport key: soccer_fifa_world_cup
 * Market: asian_handicap  (hoặc h2h nếu chỉ muốn 1X2)
 *
 * Cách dùng:
 *   node syncOdds.js                  ← chạy tay
 *   require('./syncOdds').syncOdds()  ← gọi từ server / route
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { getPool } = require("../config/db");

const ODDS_API_BASE  = "https://api.the-odds-api.com/v4";
const SPORT_KEY      = "soccer_fifa_world_cup";
const MARKET         = "spreads";
const REGIONS        = "eu";               // eu | us | uk | au
const BOOKMAKER_PREF = ["pinnacle", "bet365", "betonlineag", "draftkings"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Chuẩn hóa tên đội để so sánh fuzzy */
function norm(name = "") {
  return name.toLowerCase()
    .replace(/\brepublic\b/g, "")
    .replace(/\bkorea\b/g, "korea")
    .replace(/\busa\b/g, "united states")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function teamsMatch(dbHome, dbAway, oddsHome, oddsAway) {
  const dh = norm(dbHome), da = norm(dbAway);
  const oh = norm(oddsHome), oa = norm(oddsAway);
  return (dh.includes(oh) || oh.includes(dh)) &&
         (da.includes(oa) || oa.includes(da));
}

/**
 * Từ outcomes của asian_handicap, lấy handicap của đội home.
 * The Odds API trả: [{ name: "Team A", point: -0.5 }, { name: "Team B", point: 0.5 }]
 * → handicap home = point của outcome đầu (home team)
 */
function extractHandicap(outcomes, homeTeamName) {
  if (!outcomes || outcomes.length < 2) return null;
  // outcome đầu tiên thường là home, nhưng verify bằng tên
  const homeOc = outcomes.find(o => norm(o.name).includes(norm(homeTeamName)))
               || outcomes[0];
  const h = parseFloat(homeOc.point);
  return isNaN(h) ? null : h;
}

/** Chọn bookmaker theo thứ tự ưu tiên, fallback sang cái đầu tiên có */
function pickBookmaker(bookmakers) {
  for (const pref of BOOKMAKER_PREF) {
    const bm = bookmakers.find(b => b.key === pref || b.title?.toLowerCase().includes(pref));
    if (bm) return bm;
  }
  return bookmakers[0] || null;
}

// ─── Main sync ────────────────────────────────────────────────────────────────

async function syncOdds({ dryRun = false } = {}) {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) throw new Error("ODDS_API_KEY chưa cấu hình trong .env");

  // 1. Fetch odds từ The Odds API
  const url =
    `${ODDS_API_BASE}/sports/${SPORT_KEY}/odds` +
    `?apiKey=${apiKey}&regions=${REGIONS}&markets=${MARKET}&oddsFormat=decimal`;

  console.log("📡 Fetching odds từ The Odds API...");
  const res = await fetch(url);

  // Log quota còn lại
  const remaining = res.headers.get("x-requests-remaining");
  const used      = res.headers.get("x-requests-used");
  if (remaining) console.log(`   Quota: đã dùng ${used}, còn ${remaining}`);

  if (res.status === 401) throw new Error("ODDS_API_KEY không hợp lệ");
  if (res.status === 422) throw new Error("Sport key không đúng hoặc không active");
  if (res.status === 429) throw new Error("Vượt quota The Odds API");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`The Odds API lỗi ${res.status}: ${body}`);
  }

  const events = await res.json();
  console.log(`   → ${events.length} events nhận được từ Odds API`);
  if (events.length === 0) {
    console.log("   ℹ️  Chưa có odds (WC chưa gần, bookmaker chưa mở kèo)");
    return { updated: 0, skipped: 0, noOdds: 0 };
  }

  // 2. Lấy tất cả trận chưa khóa từ DB
  const pool = await getPool();
  const { rows: dbMatches } = await pool.query(`
    SELECT id, hometeamname, awayteamname, matchdate, handicap, islocked, resultlocked
    FROM matches
    WHERE islocked = FALSE AND resultlocked = FALSE
    ORDER BY matchdate ASC
  `);
  console.log(`   DB: ${dbMatches.length} trận chưa khóa cần match`);

  // 3. Match event → DB row và update handicap
  let updated = 0, skipped = 0, noOdds = 0;

  for (const event of events) {
    // Tìm trận trong DB khớp tên đội
    const dbMatch = dbMatches.find(m =>
      teamsMatch(m.hometeamname, m.awayteamname, event.home_team, event.away_team)
    );

    if (!dbMatch) {
      console.log(`   ⚠️  Không match DB: ${event.home_team} vs ${event.away_team}`);
      skipped++;
      continue;
    }

    // Tìm bookmaker có asian_handicap
    const bm = pickBookmaker(
      (event.bookmakers || []).filter(b =>
        b.markets?.some(mkt => mkt.key === MARKET)
      )
    );

    if (!bm) {
      console.log(`   ℹ️  Không có AH odds: ${event.home_team} vs ${event.away_team}`);
      noOdds++;
      continue;
    }

    const mkt      = bm.markets.find(m => m.key === MARKET);
    const handicap = extractHandicap(mkt?.outcomes, event.home_team);

    if (handicap === null) {
      noOdds++;
      continue;
    }

    // Chỉ update nếu giá trị thay đổi
    if (parseFloat(dbMatch.handicap) === handicap) {
      console.log(`   = Không đổi: ${event.home_team} vs ${event.away_team} hcap=${handicap}`);
      continue;
    }

    console.log(
      `   ✅ Update hcap: ${dbMatch.hometeamname} vs ${dbMatch.awayteamname}` +
      ` ${dbMatch.handicap} → ${handicap} (${bm.title})`
    );

    if (!dryRun) {
      await pool.query(
        "UPDATE matches SET handicap = $1 WHERE id = $2",
        [handicap, dbMatch.id]
      );
    }
    updated++;
  }

  console.log(`\n✅ syncOdds xong: ${updated} cập nhật, ${skipped} không match, ${noOdds} chưa có odds`);
  return { updated, skipped, noOdds };
}

// Chạy tay
if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("🔍 DRY RUN — không ghi DB");
  syncOdds({ dryRun })
    .then(r => { console.log("Result:", r); process.exit(0); })
    .catch(e => { console.error("❌", e.message); process.exit(1); });
}

module.exports = { syncOdds };
