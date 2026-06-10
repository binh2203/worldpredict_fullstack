/**
 * routes/wcRoutes.js
 * Routes cho Zafronix WC data + manual sync trigger.
 * Mount vào server.js: app.use("/api/wc", require("./routes/wcRoutes"));
 */

const express  = require("express");
const router   = express.Router();
const { authMiddleware, adminOnly } = require("../middleware/auth");
const { getWcFixtures }  = require("../controllers/wcController");
const { fetchAndSync }   = require("../services/syncService");

// Lấy fixtures từ Zafronix (pass-through — không lưu DB)
// GET /api/wc/fixtures?round=Vòng+bảng
router.get("/fixtures", authMiddleware, getWcFixtures);

// Manual sync — admin kích thủ công
// POST /api/wc/sync
router.post("/sync", authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await fetchAndSync();
    res.json({ message: "Sync hoàn tất", ...result });
  } catch (err) {
    console.error("[WC Sync] Lỗi:", err);
    res.status(502).json({ message: "Sync thất bại", detail: err.message });
  }
});

module.exports = router;