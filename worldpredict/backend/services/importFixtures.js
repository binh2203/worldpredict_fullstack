require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { getPool, sql } = require("../config/db");

const ZAFRONIX_BASE = "https://api.zafronix.com/fifa/worldcup/v1";

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

async function run() {
  // 1. Lấy data từ Zafronix
  console.log("Fetching từ Zafronix...");
  const res = await fetch(
    `${ZAFRONIX_BASE}/matches?year=2026`,
    { headers: { "X-API-Key": process.env.ZAFRONIX_API_KEY } }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("❌ Zafronix lỗi:", err.message || res.status);
    process.exit(1);
  }

  const data = await res.json();
  const matches = data.data || [];
  console.log(`Fetched ${matches.length} matches từ Zafronix`);

  if (matches.length === 0) {
    console.error("❌ Không có dữ liệu trả về");
    process.exit(1);
  }

  // 2. Kết nối DB
  const pool = await getPool();
  let count = 0;

  for (const m of matches) {
    const matchDate = new Date(`${m.date}T${m.kickoff || "00:00"}:00Z`);
    const round = mapStageToRound(m.stageNormalized || m.stage);

    await pool.request()
      .input("HomeTeamName", sql.NVarChar(100), m.homeTeam || "TBD")
      .input("AwayTeamName", sql.NVarChar(100), m.awayTeam || "TBD")
      .input("MatchDate",    sql.DateTime2,     matchDate)
      .input("Round",        sql.NVarChar(50),  round)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM Matches 
          WHERE HomeTeamName=@HomeTeamName 
            AND AwayTeamName=@AwayTeamName 
            AND MatchDate=@MatchDate
        )
        INSERT INTO Matches (HomeTeamId, HomeTeamName, AwayTeamId, AwayTeamName, MatchDate, Round)
        VALUES (0, @HomeTeamName, 0, @AwayTeamName, @MatchDate, @Round)
      `);
    count++;
  }

  console.log(`✅ Imported ${count} fixtures`);

  // 3. Đóng pool trước khi exit
  await pool.close();
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Lỗi:", err.message);
  process.exit(1);
});