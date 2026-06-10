/**
 * npm run seed
 * Tạo admin mặc định + bet rules + 10 trận mẫu
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool, closePool } = require("./db");

const DEFAULT_BET_RULES = [
  { round: "Vòng bảng",    win: 3,  lose: 1, dfLose: 2 },
  { round: "Vòng 1/16",   win: 4,  lose: 1, dfLose: 2 },
  { round: "Vòng 1/8",    win: 5,  lose: 2, dfLose: 3 },
  { round: "Tứ kết",      win: 7,  lose: 3, dfLose: 4 },
  { round: "Bán kết",     win: 10, lose: 4, dfLose: 6 },
  { round: "Tranh hạng 3",win: 10, lose: 4, dfLose: 6 },
  { round: "Chung kết",   win: 15, lose: 5, dfLose: 8 },
];

const TEAMS = [
  { name: "Brazil",    logo: "https://flagcdn.com/w80/br.png" },
  { name: "Argentina", logo: "https://flagcdn.com/w80/ar.png" },
  { name: "France",    logo: "https://flagcdn.com/w80/fr.png" },
  { name: "Germany",   logo: "https://flagcdn.com/w80/de.png" },
  { name: "Spain",     logo: "https://flagcdn.com/w80/es.png" },
  { name: "England",   logo: "https://flagcdn.com/w80/gb-eng.png" },
  { name: "Portugal",  logo: "https://flagcdn.com/w80/pt.png" },
  { name: "USA",       logo: "https://flagcdn.com/w80/us.png" },
];

const ROUNDS = ["Vòng bảng","Vòng 1/8","Tứ kết","Bán kết","Tranh hạng 3","Chung kết"];

async function seed() {
  // Admin
  const hash = await bcrypt.hash("admin123", 10);
  await pool.query(`
    INSERT INTO Users (Username, PasswordHash, FullName, Role)
    VALUES ($1, $2, 'Administrator', 'admin')
    ON CONFLICT (Username) DO NOTHING
  `, ["admin", hash]);
  console.log("✅ Admin seeded");

  // Bet rules
  for (const r of DEFAULT_BET_RULES) {
    await pool.query(`
      INSERT INTO BetRules (Round, WinPoints, LosePoints, DefaultLosePoints)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (Round) DO NOTHING
    `, [r.round, r.win, r.lose, r.dfLose]);
  }
  console.log("✅ Bet rules seeded");

  // Sample matches
  const pairs = [[0,1],[2,3],[4,5],[6,7],[0,4],[1,5],[2,6],[3,7],[0,2],[1,3]];
  for (let i = 0; i < pairs.length; i++) {
    const [hi, ai] = pairs[i];
    const home = TEAMS[hi], away = TEAMS[ai];
    const round = ROUNDS[Math.min(Math.floor(i / 2), 5)];
    const matchDate = new Date(Date.now() + (i - 3) * 86400000 + 2 * 3600000);
    await pool.query(`
      INSERT INTO Matches (HomeTeamId, HomeTeamName, HomeTeamLogo, AwayTeamId, AwayTeamName, AwayTeamLogo, MatchDate, Round)
      VALUES (0, $1, $2, 0, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [home.name, home.logo, away.name, away.logo, matchDate, round]);
  }
  console.log("✅ Sample matches seeded");

  console.log("\n🎉 Seed hoàn tất! Đăng nhập: admin / admin123");
  await closePool();
  process.exit(0);
}

seed().catch(e => { console.error("❌ Seed error:", e.message); process.exit(1); });
