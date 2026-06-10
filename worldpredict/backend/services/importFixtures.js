require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
});

const { query } = require("../config/db");

const ZAFRONIX_BASE =
  "https://api.zafronix.com/fifa/worldcup/v1";

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

async function syncFromZafronix() {
  console.log("Fetching từ Zafronix...");

  const res = await fetch(
    `${ZAFRONIX_BASE}/matches?year=2026`,
    {
      headers: {
        "X-API-Key":
          process.env.ZAFRONIX_API_KEY,
      },
    }
  );

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({}));

    console.error(
      "❌ Zafronix lỗi:",
      err.message || res.status
    );

    return {
      inserted: 0,
      updated: 0,
      error: true,
    };
  }

  const data = await res.json();
  const matches = data.data || [];

  console.log(
    `Fetched ${matches.length} matches`
  );

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

    // ─── UPSERT POSTGRES ─────────────────────────────
    const result = await query(
      `
      INSERT INTO matches (
        home_team_name,
        away_team_name,
        match_date,
        round
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (home_team_name, away_team_name, match_date)
      DO NOTHING
      RETURNING id
      `,
      [
        m.homeTeam || "TBD",
        m.awayTeam || "TBD",
        matchDate,
        round,
      ]
    );

    if (result.rows.length > 0) {
      inserted++;
    } else {
      updated++;
    }
  }

  console.log(
    `✅ Sync done: ${inserted} inserted`
  );

  return { inserted, updated };
}

module.exports = { syncFromZafronix };