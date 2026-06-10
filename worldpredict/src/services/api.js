import { API_URL } from "../constants";

// ───────────────────────────────────────────────────────────────
// API CLIENT (REAL BACKEND ONLY - NO MOCK)
// ───────────────────────────────────────────────────────────────

const api = {
  token: null,

  setToken(t) {
    api.token = t;
  },

  async call(path, opts = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    };

    if (api.token) {
      headers["Authorization"] = `Bearer ${api.token}`;
    }

    // IMPORTANT: backend uses /api prefix
    const url = `${API_URL}${path}`;

    const res = await fetch(url, {
      ...opts,
      headers,
    });

    // handle non-json safely
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const message = data?.message || res.statusText || "Lỗi server";
      throw new Error(message);
    }

    return data;
  },

  // ─────────────────────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────────────────────
  login: (username, password) =>
    api.call("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  // ─────────────────────────────────────────────────────────────
  // MATCHES
  // ─────────────────────────────────────────────────────────────
  getMatches: () => api.call("/matches"),

  setHandicap: (matchId, handicap) =>
    api.call(`/matches/${matchId}/handicap`, {
      method: "PUT",
      body: JSON.stringify({ handicap }),
    }),

  setResult: (matchId, hg, ag) =>
    api.call(`/matches/${matchId}/result`, {
      method: "POST",
      body: JSON.stringify({
        homeGoals: hg,
        awayGoals: ag,
      }),
    }),

  triggerAutoLock: () =>
    api.call("/matches/auto-lock", {
      method: "POST",
    }),

  // ─────────────────────────────────────────────────────────────
  // PREDICTIONS
  // ─────────────────────────────────────────────────────────────
  getPredictions: () => api.call("/predictions/my"),

  getAllPredictions: () => api.call("/predictions/all"),

  predict: (matchId, choice) =>
    api.call("/predictions", {
      method: "POST",
      body: JSON.stringify({ matchId, choice }),
    }),

  // ─────────────────────────────────────────────────────────────
  // BET RULES
  // ─────────────────────────────────────────────────────────────
  getBetRules: () => api.call("/betrules"),

  saveBetRule: (round, data) =>
    api.call("/betrules", {
      method: "PUT",
      body: JSON.stringify({ round, ...data }),
    }),

  // ─────────────────────────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────────────────────────
  getUsers: () => api.call("/users"),

  getUserStats: () => api.call("/users/my-stats"),

  createUser: (data) =>
    api.call("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  toggleUserActive: (userId) =>
    api.call(`/users/${userId}/toggle-active`, {
      method: "PUT",
    }),

  // ─────────────────────────────────────────────────────────────
  // LEADERBOARD
  // ─────────────────────────────────────────────────────────────
  getLeaderboard: () => api.call("/leaderboard"),

  // ─────────────────────────────────────────────────────────────
  // WC FIXTURES
  // ─────────────────────────────────────────────────────────────
  getWcFixtures: (round) =>
    api.call(
      "/wc-fixtures" +
        (round ? `?round=${encodeURIComponent(round)}` : "")
    ),
};

export default api;