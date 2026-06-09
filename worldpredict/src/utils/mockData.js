import { ROUNDS, MOCK_TEAMS, DEFAULT_BET_RULES } from "../constants";
import { shouldBeLocked } from "../utils/helpers";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

/** Tạo dữ liệu trận giả — mô phỏng chính xác cấu trúc API-Football trả về */
export function makeMockMatches() {
  const pairs = [[0,1],[2,3],[4,5],[6,7],[0,4],[1,5],[2,6],[3,7],[0,2],[1,3]];
  return pairs.map((p, i) => {
    const home = MOCK_TEAMS[p[0]], away = MOCK_TEAMS[p[1]];
    const roundIdx  = Math.min(Math.floor(i / 2), 5);
    const daysOffset = i - 3;
    const isDone    = daysOffset < 0;
    const isToday   = daysOffset === 0;
    const matchDate = new Date(
      Date.now() + daysOffset * 86400000 + (isToday ? -35 * 60000 : 2 * 3600000)
    );
    const hg = isDone ? Math.floor(Math.random() * 4) : null;
    const ag = isDone ? Math.floor(Math.random() * 4) : null;
    const locked = shouldBeLocked(matchDate.toISOString());
    return {
      id:        9000 + i,
      homeTeam:  home,
      awayTeam:  away,
      matchDate: matchDate.toISOString(),
      round:     ROUNDS[roundIdx],
      status:    isDone ? "FT" : isToday ? "1H" : "NS",
      homeGoals: hg,
      awayGoals: ag,
      handicap:  i % 3 === 0 ? (Math.random() > 0.5 ? 0.5 : -0.5) : null,
      isLocked:  locked || isDone || isToday,
      resultLocked: isDone,
      // ── Trường giả lập giống API-Football response ──────────────────────
      _source: "mock",
      fixture: {
        id: 9000 + i,
        date: matchDate.toISOString(),
        status: { short: isDone ? "FT" : isToday ? "1H" : "NS", elapsed: isDone ? 90 : isToday ? 38 : null },
      },
      goals: { home: hg, away: ag },
      league: { round: ROUNDS[roundIdx] },
    };
  });
}

/**
 * Tạo bộ dữ liệu test đầy đủ flow API-Football:
 *   1. Lịch thi đấu (NS - chưa đấu)
 *   2. Đang thi đấu (1H / 2H)
 *   3. Đã kết thúc (FT) — có kết quả thật để so sánh
 */
export function makeTestScenario() {
  const now = new Date();

  return [
    // ── Trận sắp diễn ra — user CÓ THỂ dự đoán ──────────────────────────
    {
      id: 8001,
      homeTeam: MOCK_TEAMS[0], // Brazil
      awayTeam: MOCK_TEAMS[1], // Argentina
      matchDate: new Date(now.getTime() + 2 * 3600000).toISOString(), // 2 tiếng nữa
      round: "Vòng bảng",
      status: "NS",
      homeGoals: null,
      awayGoals: null,
      handicap: 0.5,
      isLocked: false,
      resultLocked: false,
      _source: "mock_test",
      _testLabel: "🟡 Sắp đấu — Mở dự đoán",
    },
    // ── Trận đang diễn ra — user KHÔNG THỂ dự đoán (đã khóa) ─────────────
    {
      id: 8002,
      homeTeam: MOCK_TEAMS[2], // France
      awayTeam: MOCK_TEAMS[3], // Germany
      matchDate: new Date(now.getTime() - 45 * 60000).toISOString(), // bắt đầu 45 phút trước
      round: "Vòng bảng",
      status: "1H",
      homeGoals: 1,
      awayGoals: 0,
      handicap: null,
      isLocked: true,
      resultLocked: false,
      _source: "mock_test",
      _testLabel: "🔴 Đang đấu (1H) — Dự đoán bị khóa",
    },
    // ── Trận đã kết thúc — có kết quả thật, chờ so sánh + tính điểm ──────
    {
      id: 8003,
      homeTeam: MOCK_TEAMS[4], // Spain
      awayTeam: MOCK_TEAMS[5], // England
      matchDate: new Date(now.getTime() - 3 * 3600000).toISOString(), // 3 tiếng trước
      round: "Vòng bảng",
      status: "FT",
      homeGoals: 2,   // ← Kết quả thật từ "API-Football"
      awayGoals: 1,
      handicap: -0.5,
      isLocked: true,
      resultLocked: true,
      resultSetAt: new Date(now.getTime() - 30 * 60000).toISOString(),
      _source: "mock_test",
      _testLabel: "✅ Đã kết thúc — Kết quả: 2-1 Spain thắng",
      // Dự đoán đúng: Spain thắng (home goals > away goals - handicap)
      // Kèo -0.5 → Spain thực tế thắng (2 - 0.5 = 1.5 > 1) → HOME WIN
    },
    // ── Trận đã kết thúc — hòa ───────────────────────────────────────────
    {
      id: 8004,
      homeTeam: MOCK_TEAMS[6], // Portugal
      awayTeam: MOCK_TEAMS[7], // USA
      matchDate: new Date(now.getTime() - 5 * 3600000).toISOString(),
      round: "Vòng bảng",
      status: "FT",
      homeGoals: 1,
      awayGoals: 1,
      handicap: null,
      isLocked: true,
      resultLocked: true,
      resultSetAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      _source: "mock_test",
      _testLabel: "✅ Đã kết thúc — Kết quả: 1-1 Hòa",
    },
  ];
}

/** User admin mặc định */
export const DEFAULT_ADMIN = {
  id: 1,
  username: "admin",
  password: "admin123",
  fullName: "Administrator",
  role: "admin",
  points: 0,
  isActive: true,
  createdAt: new Date().toISOString(),
};

export { DEFAULT_BET_RULES };
