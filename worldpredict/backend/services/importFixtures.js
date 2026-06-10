require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
});
const { getPool, closePool } = require("../config/db");

const ZAFRONIX_BASE = "https://api.zafronix.com/fifa/worldcup/v1";

function mapStageToRound(stage) {
  if (!stage) return "Vong bang";
  if (stage.startsWith("group_")) return "Vong bang";
  if (stage === "round_of_32")    return "Vong 1/16";
  if (stage === "round_of_16")    return "Vong 1/8";
  if (stage === "quarter_final")  return "Tu ket";
  if (stage === "semi_final")     return "Ban ket";
  if (stage === "third_place")    return "Tranh hang 3";
  if (stage === "final")          return "Chung ket";
  return "Vong bang";
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
    "Germany":"de","France":"fr","Spain":"es","England":"gb-eng",
    "Portugal":"pt","Italy":"it","Netherlands":"nl","Belgium":"be",
    "Morocco":"ma","Senegal":"sn","Nigeria":"ng","Japan":"jp",
    "South Korea":"kr","Australia":"au","Saudi Arabia":"sa",
    "Ecuador":"ec","Peru":"pe","Chile":"cl","Paraguay":"py",
    "Panama":"pa","Costa Rica":"cr","Honduras":"hn","Jamaica":"jm",
    "Switzerland":"ch","Croatia":"hr","Serbia":"rs","Austria":"at",
    "Poland":"pl","Ukraine":"ua","Turkey":"tr","Ghana":"gh",
    "Tunisia":"tn","Egypt":"eg","Algeria":"dz","Iran":"ir",
    "Korea Republic":"kr","New Zealand":"nz","Venezuela":"ve",
  };
  const iso = isoMap[teamName];
  return iso ? "https://flagcdn.com/w80/" + iso + ".png"
             : "https://flagcdn.com/w80/un.png";
}

async function run() {
  console.log("Fetching tu Zafronix...");
  const res = await fetch(ZAFRONIX_BASE + "/matches?year=2026", {
    headers: { "X-API-Key": process.env.ZAFRONIX_API_KEY },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Zafronix API loi: " + err);
  }

  const data    = await res.json();
  const matches = data.data || [];
  console.log("Fetched " + matches.length + " matches tu Zafronix");

  if (matches.length === 0) {
    console.log("Khong co du lieu.");
    return;
  }

  const pool = await getPool();
  let inserted = 0;
  let updated  = 0;

  for (const m of matches) {
    const matchDate = new Date(m.date + "T" + (m.kickoff || "00:00") + ":00Z");
    const round     = mapStageToRound(m.stageNormalized || m.stage);
    const status    = mapStatus(m);
    const homeName  = m.homeTeam  || "TBD";
    const awayName  = m.awayTeam  || "TBD";
    const homeLogo  = buildFlagUrl(homeName);
    const awayLogo  = buildFlagUrl(awayName);
    const homeGoals = (m.homeScore !== undefined && m.homeScore !== null) ? m.homeScore : null;
    const awayGoals = (m.awayScore !== undefined && m.awayScore !== null) ? m.awayScore : null;

    try {
      // Kiem tra da ton tai chua
      const exist = await pool.query(
        "SELECT id, resultlocked FROM matches WHERE hometeamname = $1 AND awayteamname = $2 AND matchdate = $3",
        [homeName, awayName, matchDate]
      );

      if (exist.rows.length === 0) {
        // INSERT moi
        await pool.query(
          "INSERT INTO matches (hometeamname, hometeamlogo, awayteamname, awayteamlogo, matchdate, round, status, homegoals, awaygoals) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
          [homeName, homeLogo, awayName, awayLogo, matchDate, round, status, homeGoals, awayGoals]
        );
        inserted++;
      } else {
        // UPDATE neu chua niem phong
        const row = exist.rows[0];
        if (!row.resultlocked && (status !== "NS" || homeGoals !== null)) {
          await pool.query(
            "UPDATE matches SET status = $1, homegoals = $2, awaygoals = $3 WHERE id = $4",
            [status, homeGoals, awayGoals, row.id]
          );
          updated++;
        }
      }
    } catch (err) {
      console.error("Loi tran " + homeName + " vs " + awayName + ": " + err.message);
    }
  }

  console.log("Done: " + inserted + " inserted, " + updated + " updated");
  await closePool();
}

run().catch(async function(err) {
  console.error("Loi:", err.message);
  try { await closePool(); } catch(e) {}
  process.exit(1);
});
