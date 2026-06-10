/**
 * routes/testDataRoutes.js
 * Routes cho API-Football test data.
 * Mount vào server.js: app.use("/api/test-data", require("./routes/testDataRoutes"));
 */

const express    = require("express");
const router     = express.Router();
const { authMiddleware, adminOnly } = require("../middleware/auth");
const {
  getTestFixtures,
  getLiveFixtures,
  searchLeagues,
  getTodayWcMatches,
} = require("../controllers/testDataController");

// Fixtures hôm nay & ngày mai từ API-Football
// GET /api/test-data/fixtures?days=both&league=1&tz=Asia/Ho_Chi_Minh
router.get("/fixtures", authMiddleware, adminOnly, getTestFixtures);

// Trận đang live
// GET /api/test-data/live
router.get("/live", authMiddleware, adminOnly, getLiveFixtures);

// Tìm league_id
// GET /api/test-data/leagues?search=world+cup
router.get("/leagues", authMiddleware, adminOnly, searchLeagues);

// ⭐ Lấy tối đa 2 trận WC hôm nay từ DB (dùng để test logic web)
// GET /api/test-data/today-wc   — chỉ cần đăng nhập, không cần admin
router.get("/today-wc", getTodayWcMatches);
module.exports = router;