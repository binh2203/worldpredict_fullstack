const router = require("express").Router();
const { authMiddleware, adminOnly } = require("../middleware/auth");

// ─── CONTROLLERS ─────────────────────────────────────────────
const authCtrl        = require("../controllers/authController");
const matchesCtrl     = require("../controllers/matchesController");
const predictionsCtrl = require("../controllers/predictionsController");
const usersCtrl       = require("../controllers/usersController");
const betRulesCtrl    = require("../controllers/betRulesController");
const wcCtrl          = require("../controllers/wcController");

// ─── SERVICES ────────────────────────────────────────────────
const { syncFromZafronix } = require("../services/syncFixtures");


// ──────────────────────────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────────────────────────
router.post("/auth/login", authCtrl.login);


// ──────────────────────────────────────────────────────────────
// MATCHES
// ──────────────────────────────────────────────────────────────
router.get("/matches", matchesCtrl.getMatches);

router.put(
  "/matches/:id/handicap",
  authMiddleware,
  adminOnly,
  matchesCtrl.setHandicap
);

router.post(
  "/matches/:id/result",
  authMiddleware,
  adminOnly,
  matchesCtrl.setResult
);

router.post(
  "/matches/auto-lock",
  authMiddleware,
  adminOnly,
  matchesCtrl.autoLock
);


// ──────────────────────────────────────────────────────────────
// PREDICTIONS
// ──────────────────────────────────────────────────────────────
router.get(
  "/predictions/my",
  authMiddleware,
  predictionsCtrl.getMyPredictions
);

router.get(
  "/predictions/all",
  authMiddleware,
  adminOnly,
  predictionsCtrl.getAllPredictions
);

router.post(
  "/predictions",
  authMiddleware,
  predictionsCtrl.predict
);


// ──────────────────────────────────────────────────────────────
// BET RULES
// ──────────────────────────────────────────────────────────────
router.get("/betrules", betRulesCtrl.getBetRules);

router.put(
  "/betrules",
  authMiddleware,
  adminOnly,
  betRulesCtrl.saveBetRule
);


// ──────────────────────────────────────────────────────────────
// USERS
// ──────────────────────────────────────────────────────────────
router.get(
  "/users",
  authMiddleware,
  adminOnly,
  usersCtrl.getUsers
);

router.get(
  "/users/my-stats",
  authMiddleware,
  usersCtrl.getMyStats
);

router.post(
  "/users",
  authMiddleware,
  adminOnly,
  usersCtrl.createUser
);

router.put(
  "/users/:id/toggle-active",
  authMiddleware,
  adminOnly,
  usersCtrl.toggleUserActive
);


// ──────────────────────────────────────────────────────────────
// LEADERBOARD
// ──────────────────────────────────────────────────────────────
router.get("/leaderboard", usersCtrl.getLeaderboard);


// ──────────────────────────────────────────────────────────────
// WC FIXTURES (ZAFRONIX)
// ──────────────────────────────────────────────────────────────
// PUBLIC: dùng cho frontend (Netlify)
router.get("/wc-fixtures", wcCtrl.getWcFixtures);


// ──────────────────────────────────────────────────────────────
// ADMIN SYNC FIXTURES
// ──────────────────────────────────────────────────────────────
router.post(
  "/admin/sync-fixtures",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const result = await syncFromZafronix();

      res.json({
        message: "Sync hoàn tất",
        inserted: result.inserted,
        updated: result.updated
      });
    } catch (err) {
      console.error("[SYNC ZAFRONIX ERROR]", err);

      res.status(500).json({
        message: "Sync thất bại",
        error: err.message
      });
    }
  }
);

module.exports = router;