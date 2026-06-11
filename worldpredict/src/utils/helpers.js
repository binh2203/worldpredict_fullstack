import { LOCK_BEFORE_MINUTES } from "../constants";

// ─── MATCH HELPERS ────────────────────────────────────────────────────────────

/**
 * Áp tỷ lệ kèo chấp châu Á → trả "home" | "away" | null
 * Kèo .25/.75 (split): thắng nửa = thắng, thua nửa = thua
 * null chỉ xảy ra với kèo .00/.50 khi hòa kèo (hoàn tiền)
 */
export function applyHandicap(homeGoals, awayGoals, handicap) {
  if (!handicap) {
    if (homeGoals > awayGoals) return "home";
    if (homeGoals < awayGoals) return "away";
    return null;
  }

  const absH = Math.abs(handicap);
  const sign = Math.sign(handicap);

  // Kèo .25/.75 → split 2 dòng, thắng nửa = thắng / thua nửa = thua
  if (absH % 0.5 !== 0) {
    const line1 = (Math.floor(absH * 2) / 2) * sign; // VD: -1.25 → -1.00
    const line2 = (Math.ceil(absH * 2) / 2) * sign;  // VD: -1.25 → -1.50
    const r1 = homeGoals + line1 > awayGoals ? "home" : "away";
    const r2 = homeGoals + line2 > awayGoals ? "home" : "away";
    if (r1 === "home" || r2 === "home") return "home";
    return "away";
  }

  // Kèo .00/.50 → tính thẳng, có thể hòa kèo
  const adj = homeGoals + handicap;
  if (adj > awayGoals) return "home";
  if (adj < awayGoals) return "away";
  return null; // hòa kèo → hoàn tiền
}

/** Kết quả thực tế (có tính kèo nếu có). */
export function getMatchResult(homeGoals, awayGoals, handicap) {
  if (homeGoals === null || awayGoals === null) return null;
  if (handicap != null) return applyHandicap(homeGoals, awayGoals, handicap);
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
