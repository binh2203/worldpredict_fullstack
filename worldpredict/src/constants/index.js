// ─── APP CONSTANTS ────────────────────────────────────────────────────────────

export const API_URL = "http://localhost:5000/api";
export const LOCK_BEFORE_MINUTES = 30;
export const USE_MOCK = false;

export const ROUNDS = [
  "Vòng bảng",
  "Vòng 1/8",
  "Tứ kết",
  "Bán kết",
  "Tranh hạng 3",
  "Chung kết",
];

export const LIVE_STATUSES = ["1H", "2H", "HT", "ET", "BT", "P", "INT"];
export const DONE_STATUSES = ["FT", "AET", "PEN"];

// Điểm mặc định (không còn tiền VNĐ)
export const DEFAULT_BET_RULES = {
  "Vòng bảng":    { winPoints: 3,  losePoints: 1, defaultLosePoints: 2  },
  "Vòng 1/8":     { winPoints: 5,  losePoints: 2, defaultLosePoints: 3  },
  "Tứ kết":       { winPoints: 7,  losePoints: 3, defaultLosePoints: 4  },
  "Bán kết":      { winPoints: 10, losePoints: 4, defaultLosePoints: 6  },
  "Tranh hạng 3": { winPoints: 10, losePoints: 4, defaultLosePoints: 6  },
  "Chung kết":    { winPoints: 15, losePoints: 5, defaultLosePoints: 8  },
};

export const MOCK_TEAMS = [
  { id: 6,  name: "Brazil",    logo: "https://media.api-sports.io/football/teams/6.png"  },
  { id: 26, name: "Argentina", logo: "https://media.api-sports.io/football/teams/26.png" },
  { id: 2,  name: "France",    logo: "https://media.api-sports.io/football/teams/2.png"  },
  { id: 25, name: "Germany",   logo: "https://media.api-sports.io/football/teams/25.png" },
  { id: 9,  name: "Spain",     logo: "https://media.api-sports.io/football/teams/9.png"  },
  { id: 10, name: "England",   logo: "https://media.api-sports.io/football/teams/10.png" },
  { id: 27, name: "Portugal",  logo: "https://media.api-sports.io/football/teams/27.png" },
  { id: 21, name: "USA",       logo: "https://media.api-sports.io/football/teams/21.png" },
];
