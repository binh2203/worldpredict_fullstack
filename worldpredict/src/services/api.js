import { API_URL, USE_MOCK } from "../constants";

// ─── API CLIENT ───────────────────────────────────────────────────────────────
// Khi USE_MOCK = true  → chạy offline (localStorage)
// Khi USE_MOCK = false → gọi backend Express + PostgreSQL thật

const api = {
  token: null,

  setToken(t) { api.token = t; },

  async call(path, opts = {}) {
    const headers = { "Content-Type": "application/json" };
    if (api.token) headers["Authorization"] = `Bearer ${api.token}`;
    const r = await fetch(`${API_URL}${path}`, {
      ...opts,
      headers: { ...headers, ...opts.headers },
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ message: r.statusText }));
      throw new Error(err.message || "Lỗi server");
    }
    return r.json();
  },

  // ── AUTH ──────────────────────────────────────────────────────────────────
  login:    (username, password) =>
    api.call("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  // ── MATCHES ───────────────────────────────────────────────────────────────
  getMatches:      ()                  => api.call("/matches"),
  setHandicap:     (matchId, handicap) => api.call(`/matches/${matchId}/handicap`, { method: "PUT",  body: JSON.stringify({ handicap }) }),
  setResult:       (matchId, hg, ag)   => api.call(`/matches/${matchId}/result`,   { method: "POST", body: JSON.stringify({ homeGoals: hg, awayGoals: ag }) }),
  triggerAutoLock: ()                  => api.call("/matches/auto-lock", { method: "POST" }),

  // ── PREDICTIONS ───────────────────────────────────────────────────────────
  getPredictions:   ()               => api.call("/predictions/my"),
  getAllPredictions: ()               => api.call("/predictions/all"),
  predict:          (matchId, choice) => api.call("/predictions", { method: "POST", body: JSON.stringify({ matchId, choice }) }),

  // ── BET RULES ─────────────────────────────────────────────────────────────
  getBetRules: ()             => api.call("/betrules"),
  saveBetRule: (round, data)  => api.call("/betrules", { method: "PUT", body: JSON.stringify({ round, ...data }) }),

  // ── USERS ─────────────────────────────────────────────────────────────────
  getUsers:         ()       => api.call("/users"),
  getUserStats:     ()       => api.call("/users/my-stats"),
  createUser:       (data)   => api.call("/users", { method: "POST", body: JSON.stringify(data) }),
  toggleUserActive: (userId) => api.call(`/users/${userId}/toggle-active`, { method: "PUT" }),

  // ── LEADERBOARD ───────────────────────────────────────────────────────────
  getLeaderboard: () => api.call("/leaderboard"),

  // ── WC FIXTURES (Zafronix — qua routes/index.js → /api/wc-fixtures) ──────
  getWcFixtures: (round) =>
    api.call("/wc-fixtures" + (round ? `?round=${encodeURIComponent(round)}` : "")),
};

export { USE_MOCK };
export default api;