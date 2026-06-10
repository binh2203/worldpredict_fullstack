require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
});

const { getPool, closePool } = require("../config/db");

const ZAFRONIX_BASE =
  "https://api.zafronix.com/fifa/worldcup/v1";

// ─────────────────────────────────────────────
function mapStageToRound(stage) {
  if (!stage) return "Vòng bảng";
  if (stage.startsWith("group_"))
    return "Vòng bảng";
  if (stage === "round_of_32")
    return "Vòng 1/16";
  if (stage === "round_of_16")
    return "Vòng 1/8";
  if (stage === "quarter_final")
    return "Tứ kết";
  if (stage === "semi_final")
    return "Bán kết";
  if (stage === "third_place")
    return "Tranh hạng 3";
  if (stage === "final")
    return "Chung kết";
  return "Vòng bảng";
}

// ─────────────────────────────────────────────
function mapStatus(m) {
  if (m.liveMinute != null)
    return m.liveMinute <= 45 ? "1H" : "2H";

  if (
    m.homeScore !== null &&
    m.awayScore !== null
  ) {
    if (m.penalties) return "PEN";
    if (m.extraTime) return "AET";
    return "FT";
  }

  return "NS";
}

// ─────────────────────────────────────────────
function buildFlagUrl(teamName) {
  const isoMap = {
    USA: "us",
    "United States": "us",
    Mexico: "mx",
    Canada: "ca",
    Brazil: "br",
    Argentina: "ar",
    Uruguay: "uy",
    Colombia: "co",
    Ecuador: "ec",
    Peru: "pe",
    Chile: "cl",
    Paraguay: "py",
    Germany: "de",
    France: "fr",
    Spain: "es",
    England: "gb-eng",
    Portugal: "pt",
    Italy: "it",
    Netherlands: "nl",
    Belgium: "be",
    Japan: "jp",
    "South Korea": "kr",
    Vietnam: "vn",
  };

  const iso = isoMap[teamName];

  return iso
    ? `https://flagcdn.com/w80/${iso}.png`
    : `https://flagcdn.com/w80/un.png`;
}

// ─────────────────────────────────────────────
async function syncFromZafronix() {
  const apiKey = process.env.ZAFRONIX_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ZAFRONIX_API_KEY chưa cấu hình"
    );
  }

  console.log("📡 Fetching Zafronix...");

  const res = await fetch(
    `${ZAFRONIX_BASE}/matches?year=2026`,
    {
      headers: {
        "X-API-Key": apiKey,
      },
    }
  );

  if (res.status === 429)
    throw new Error("Quá quota Zafronix");

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({}));

    throw new Error(
      `Zafronix lỗi ${res.status}: ${
        err.message || "unknown"
      }`
    );
  }

  const data = await res.json();
  const matches = data.data || [];

  console.log(
    `→ ${matches.length} trận nhận được`
  );

  if (!matches.length) {
    throw new Error(
      "Zafronix trả về 0 trận"
    );
  }

  const pool = await getPool();

  let inserted = 0;
  let updated = 0;

  for (const m of matches) {
    const matchDate = new Date(
      `${m.date}T${
        m.kickoff || "00:00"
      }:00Z`
    );

    const round = mapStageToRound(
      m.stageNormalized || m.stage
    );

    const status = mapStatus(m);

    const homeGoals = m.homeScore ?? null;
    const awayGoals = m.awayScore ?? null;

    const homeName = m.homeTeam || "TBD";
    const awayName = m.awayTeam || "TBD";

    const homeLogo = buildFlagUrl(homeName);
    const awayLogo = buildFlagUrl(awayName);

    // ─── UPSERT POSTGRES ─────────────────────
    const result = await pool.query(
      `
      INSERT INTO matches (
        home_team_name,
        home_team_logo,
        away_team_name,
        away_team_logo,
        match_date,
        round,
        status,
        home_goals,
        away_goals
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (home_team_name, away_team_name, match_date)
      DO UPDATE SET
        status = EXCLUDED.status,
        home_goals = EXCLUDED.home_goals,
        away_goals = EXCLUDED.away_goals
      RETURNING id, xmax
      `,
      [
        homeName,
        homeLogo,
        awayName,
        awayLogo,
        matchDate,
        round,
        status,
        homeGoals,
        awayGoals,
      ]
    );

    // xmax = 0 → insert, >0 → update
    if (result.rows[0]?.xmax === 0) {
      inserted++;
    } else {
      updated++;
    }
  }

  console.log(
    `✅ Sync done: ${inserted} inserted, ${updated} updated`
  );

  return {
    inserted,
    updated,
    total: matches.length,
  };
}

// ─── RUN standalone ───────────────────────────
if (require.main === module) {
  syncFromZafronix()
    .then((r) => {
      console.log("Result:", r);
      process.exit(0);
    })
    .catch((e) => {
      console.error("❌", e.message);
      process.exit(1);
    })
    .finally(() => closePool());
}

module.exports = { syncFromZafronix };