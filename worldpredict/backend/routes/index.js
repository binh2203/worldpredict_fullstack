const router = require("express").Router();
const { authMiddleware, adminOnly } = require("../middleware/auth");

const authCtrl        = require("../controllers/authController");
const matchesCtrl     = require("../controllers/matchesController");
const predictionsCtrl = require("../controllers/predictionsController");
const usersCtrl       = require("../controllers/usersController");
const betRulesCtrl    = require("../controllers/betRulesController");
const wcCtrl          = require("../controllers/wcController");       // ← Zafronix
const { syncFromZafronix } = require("../services/syncFixtures");   // ← sync job
const { syncOdds }         = require("../services/syncOdds");        // ← odds sync

// ─── AUTH ─────────────────────────────────────────────────────────────────────
router.post("/auth/login",           authCtrl.login);
router.put ("/auth/change-password", authMiddleware, authCtrl.changePassword);
// register bị tắt — tài khoản do admin tạo

// ─── MATCHES ──────────────────────────────────────────────────────────────────
router.get ("/matches",              matchesCtrl.getMatches);
router.put ("/matches/:id/handicap", authMiddleware, adminOnly, matchesCtrl.setHandicap);
router.post("/matches/:id/result",   authMiddleware, adminOnly, matchesCtrl.setResult);
router.post("/matches/auto-lock",    authMiddleware, adminOnly, matchesCtrl.autoLock);

// ─── PREDICTIONS ──────────────────────────────────────────────────────────────
router.get ("/predictions/my",  authMiddleware, predictionsCtrl.getMyPredictions);
router.get ("/predictions/all", authMiddleware, adminOnly, predictionsCtrl.getAllPredictions);
router.post("/predictions",     authMiddleware, predictionsCtrl.predict);

// ─── BET RULES ────────────────────────────────────────────────────────────────
router.get("/betrules",  betRulesCtrl.getBetRules);
router.put("/betrules",  authMiddleware, adminOnly, betRulesCtrl.saveBetRule);

// ─── USERS ────────────────────────────────────────────────────────────────────
router.get ("/users",                   authMiddleware, usersCtrl.getUsers);
router.get ("/users/my-stats",          authMiddleware, usersCtrl.getMyStats);
router.post("/users",                   authMiddleware, adminOnly, usersCtrl.createUser);
router.put ("/users/:id/toggle-active", authMiddleware, adminOnly, usersCtrl.toggleUserActive);

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
router.get("/leaderboard", usersCtrl.getLeaderboard);

// ─── WC FIXTURES (Zafronix) ───────────────────────────────────────────────────
// GET /api/wc-fixtures          → frontend PageHome dùng cho stats vòng bảng
// GET /api/wc-fixtures?round=XX → filter theo vòng
router.get("/wc-fixtures", authMiddleware, adminOnly, wcCtrl.getWcFixtures);

// ─── SYNC FIXTURES (admin trigger thủ công) ───────────────────────────────────
// POST /api/admin/sync-fixtures → kéo Zafronix về DB ngay lập tức
router.post("/admin/sync-fixtures", authMiddleware, adminOnly, async (req, res) => {
  const result = await syncFromZafronix();
  res.json({ message: `Sync xong: ${result.inserted} mới, ${result.updated} cập nhật`, ...result });
});

// POST /api/admin/sync-odds → kéo kèo chấp từ The Odds API ngay lập tức
router.post("/admin/sync-odds", authMiddleware, adminOnly, async (req, res) => {
  const result = await syncOdds();
  res.json({
    message: `Odds sync xong: ${result.updated} cập nhật, ${result.skipped} không match, ${result.noOdds} chưa có odds`,
    ...result,
  });
});

module.exports = router;
