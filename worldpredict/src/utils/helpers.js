import { LOCK_BEFORE_MINUTES } from "../constants";

// ─── MATCH HELPERS ────────────────────────────────────────────────────────────

/** Áp tỷ lệ kèo chấp → trả "home" | "away" | null (hòa kèo = không ai thắng) */
export function applyHandicap(homeGoals, awayGoals, handicap) {
  const adjHome = homeGoals + (handicap || 0);
  if (adjHome > awayGoals) return "home";
  if (adjHome < awayGoals) return "away";
  return null;
}

/** Kết quả thực tế (có tính kèo nếu có). */
export function getMatchResult(homeGoals, awayGoals, handicap) {
  if (homeGoals === null || awayGoals === null) return null;
  if (handicap) return applyHandicap(homeGoals, awayGoals, handicap);
  if (homeGoals > awayGoals) return "home";
  if (homeGoals < awayGoals) return "away";
  return null;
}

/** Kiểm tra trận có nên bị khóa chưa (frontend guard) */
export function shouldBeLocked(matchDate) {
  return new Date(matchDate) - Date.now() <= LOCK_BEFORE_MINUTES * 60 * 1000;
}

/** Phân loại trạng thái trận: "live" | "done" | "upcoming" */
export function matchStatusType(m) {
  if (["FT", "AET", "PEN"].includes(m.status)) return "done";
  if (["1H", "2H", "HT", "ET", "BT", "P", "INT"].includes(m.status)) return "live";
  return "upcoming";
}

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────

const VN_TZ = "Asia/Ho_Chi_Minh";

/** Format điểm: +3 điểm / -1 điểm */
export function fmtPoints(n) {
  if (n === null || n === undefined) return "0 điểm";
  return (n >= 0 ? "+" : "") + n + " điểm";
}

/** Giữ lại fmtMoney alias để không cần đổi hết codebase cũ */
export const fmtMoney = fmtPoints;

export function fmtDate(d) {
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", timeZone: VN_TZ,
  });
}

export function fmtTime(d) {
  return new Date(d).toLocaleTimeString("vi-VN", {
    hour: "2-digit", minute: "2-digit", timeZone: VN_TZ,
  });
}

export function fmtDateTime(d) {
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: VN_TZ,
  });
}

export function getCountdown(dateStr) {
  const diff = new Date(dateStr) - Date.now();
  if (diff <= 0) return null;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h${mins % 60}p`;
  return `${mins}p`;
}

// ─── LOCAL STORAGE STORE ──────────────────────────────────────────────────────

export const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};