require("dotenv").config();
const bcrypt = require("bcryptjs");
const { query } = require("./db");

const ROUNDS = ["Vòng bảng","Vòng 1/8","Tứ kết","Bán kết","Tranh hạng 3","Chung kết"];

const DEFAULT_BET_RULES = [
  { round: "Vòng bảng",    win: 20000, draw: 10000, lose: 20000, dfLose: 20000 },
  { round: "Vòng 1/8",     win: 30000, draw: 15000, lose: 30000, dfLose: 30000 },
  { round: "Tứ kết",       win: 40000, draw: 20000, lose: 40000, dfLose: 40000 },
  { round: "Bán kết",      win: 50000, draw: 25000, lose: 50000, dfLose: 50000 },
  { round: "Tranh hạng 3", win: 50000, draw: 25000, lose: 50000, dfLose: 50000 },
  { round: "Chung kết",    win:100000, draw: 50000, lose:100000, dfLose:100000 },
];

const TEAMS = [
  { id: 6,  name: "Brazil",    logo: "https://media.api-sports.io/football/teams/6.png"  },
  { id: 26, name: "Argentina", logo: "https://media.api-sports.io/football/teams/26.png" },
  { id: 2,  name: "France",    logo: "https://media.api-sports.io/football/teams/2.png"  },
  { id: 25, name: "Germany",   logo: "https://media.api-sports.io/football/teams/25.png" },
  { id: 9,  name: "Spain",     logo: "https://media.api-sports.io/football/teams/9.png"  },
  { id: 10, name: "England",   logo: "https://media.api-sports.io/football/teams/10.png" },
  { id: 27, name: "Portugal",  logo: "https://media.api-sports.io/football/teams/27.png" },
  { id: 21, name: "USA",       logo: "https://media.api-sports.io/football/teams/21.png" },
];

async function seed() {
  // ── Admin user ───────────────────────────────────────────────
  const hash = await bcrypt.hash("admin123", 10);

  await query(
    `
    INSERT INTO users (username, password, full_name, role)
    VALUES ($1, $2, $3, 'admin')
    ON CONFLICT (username) DO NOTHING
    `,
    ["admin", hash, "Administrator"]
  );

  console.log("✅ Admin seeded");

  // ── Bet rules ────────────────────────────────────────────────
  for (const r of DEFAULT_BET_RULES) {
    await query(
      `
      INSERT INTO bet_rules (round, win_amount, draw_amount, lose_amount, default_lose_amount)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (round) DO NOTHING
      `,
      [r.round, r.win, r.draw, r.lose, r.dfLose]
    );
  }

  console.log("✅ Bet rules seeded");

  // ── Sample matches ───────────────────────────────────────────
  const pairs = [[0,1],[2,3],[4,5],[6,7],[0,4],[1,5],[2,6],[3,7],[0,2],[1,3]];

  for (let i = 0; i < pairs.length; i++) {
    const [hi, ai] = pairs[i];
    const home = TEAMS[hi];
    const away = TEAMS[ai];
    const round = ROUNDS[Math.min(Math.floor(i / 2), 5)];

    const matchDate = new Date(Date.now() + (i - 3) * 86400000 + 2 * 3600000);

    await query(
      `
      INSERT INTO matches (
        home_team_id, home_team_name, home_team_logo,
        away_team_id, away_team_name, away_team_logo,
        match_date, round
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (home_team_id, away_team_id, match_date::date) DO NOTHING
      `,
      [
        home.id,
        home.name,
        home.logo,
        away.id,
        away.name,
        away.logo,
        matchDate,
        round
      ]
    );
  }

  console.log("✅ Sample matches seeded");

  console.log("\n🎉 Seed hoàn tất! Login: admin / admin123");
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Seed error:", e.message);
  process.exit(1);
});