/**
 * syncFixtures.js — Đồng bộ trận đấu từ Zafronix vào PostgreSQL
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { getPool, closePool } = require("../config/db");

const ZAFRONIX_BASE = "https://api.zafronix.com/fifa/worldcup/v1";

function mapStageToRound(stage) {
  if (!stage) return "Vòng bảng";
  if (stage.startsWith("group_")) return "Vòng bảng";
  if (stage === "round_of_32")    return "Vòng 1/16";
  if (stage === "round_of_16")    return "Vòng 1/8";
  if (stage === "quarter_final")  return "Tứ kết";
  if (stage === "semi_final")     return "Bán kết";
  if (stage === "third_place")    return "Tranh hạng 3";
  if (stage === "final")          return "Chung kết";
  return "Vòng bảng";
}

function mapStatus(m) {
  if (m.liveMinute != null) return m.liveMinute <= 45 ? "1H" : "2H";
  if (m.homeScore !== null && m.awayScore !== null) {
    if (m.penalties) return "PEN";
    if (m.extraTime) return "AET";
    return "FT";
  }
  return "NS";
}

function buildFlagUrl(teamName) {
  const isoMap = {
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
    "Saudi Arabia":"sa","Iran":"ir","Qatar":"qa",
    "Korea Republic":"kr","Czechia":"cz","New Zealand":"nz",
    "Venezuela":"ve","Bolivia":"bo","South Africa":"za",
  };
  const iso = isoMap[teamName];
  return iso ? `https://flagcdn.com/w80/${iso}.png` : `https://flagcdn.com/w80/un.png`;
}

async function syncFromZafronix() {
  const apiKey = process.env.ZAFRONIX_API_KEY;
  if (!apiKey) throw new Error("ZAFRONIX_API_KEY chưa cấu hình trong .env");

  console.log("📡 Fetching từ Zafronix...");
  const res = await fetch(`${ZAFRONIX_BASE}/matches?year=2026`, {
    headers: { "X-API-Key": apiKey },
  });

  if (res.status === 429) throw new Error("Quá quota Zafronix (429)");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Zafronix lỗi ${res.status}: ${err.message || "unknown"}`);
  }

  const data = await res.json();
  const matches = data.data || [];
  console.log(`   → ${matches.length} trận nhận được`);
  if (matches.length === 0) throw new Error("Zafronix trả về 0 trận");

  const pool = await getPool();
  let inserted = 0, updated = 0;

  for (const m of matches) {
    const matchDate = new Date(`${m.date}T${m.kickoff || "00:00"}:00Z`);
    const round     = mapStageToRound(m.stageNormalized || m.stage);
    const status    = mapStatus(m);
    const homeGoals = m.homeScore ?? null;
    const awayGoals = m.awayScore ?? null;
    const homeName  = m.homeTeam || "TBD";
    const awayName  = m.awayTeam || "TBD";
    const homeLogo  = buildFlagUrl(homeName);
    const awayLogo  = buildFlagUrl(awayName);

    const exist = await pool.query(
      "SELECT Id, ResultLocked FROM Matches WHERE HomeTeamName=$1 AND AwayTeamName=$2 AND MatchDate=$3",
      [homeName, awayName, matchDate]
    );

    if (exist.rows.length === 0) {
      await pool.query(`
        INSERT INTO Matches
          (HomeTeamId, HomeTeamName, HomeTeamLogo, AwayTeamId, AwayTeamName, AwayTeamLogo,
           MatchDate, Round, Status, HomeGoals, AwayGoals)
        VALUES (0, $1, $2, 0, $3, $4, $5, $6, $7, $8, $9)
      `, [homeName, homeLogo, awayName, awayLogo, matchDate, round, status, homeGoals, awayGoals]);
      inserted++;
    } else {
      const row = exist.rows[0];
      if (!row.resultlocked && (status !== "NS" || homeGoals !== null)) {
        await pool.query(
          "UPDATE Matches SET Status=$1, HomeGoals=$2, AwayGoals=$3 WHERE Id=$4",
          [status, homeGoals, awayGoals, row.id]
        );
        updated++;
      }
    }
  }

  console.log(`✅ Sync xong: ${inserted} inserted, ${updated} updated`);
  return { inserted, updated, total: matches.length };
}

if (require.main === module) {
  syncFromZafronix()
    .then(r => { console.log("Result:", r); process.exit(0); })
    .catch(e => { console.error("❌", e.message); process.exit(1); })
    .finally(() => closePool());
}

module.exports = { syncFromZafronix };
