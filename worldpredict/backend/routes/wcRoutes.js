const express = require("express");
const router = express.Router();

const { authMiddleware, adminOnly } = require("../middleware/auth");

// Controller
const wcCtrl = require("../controllers/wcController");

// Service sync (giữ nếu bạn cần sync riêng service này)
const { fetchAndSync } = require("../services/syncService");


// ─────────────────────────────────────────────
// PUBLIC: Get WC fixtures (Zafronix)
// ─────────────────────────────────────────────
// GET /api/wc-fixtures?round=Vòng+bảng
router.get("/wc-fixtures", wcCtrl.getWcFixtures);


// ─────────────────────────────────────────────
// ADMIN: Manual sync data from Zafronix
// ─────────────────────────────────────────────
// POST /api/admin/sync-fixtures
router.post(
  "/admin/sync-fixtures",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const result = await fetchAndSync();

      res.json({
        message: "Sync hoàn tất",
        inserted: result.inserted,
        updated: result.updated
      });
    } catch (err) {
      console.error("[WC SYNC ERROR]", err);

      res.status(502).json({
        message: "Sync thất bại",
        error: err.message
      });
    }
  }
);

module.exports = router;