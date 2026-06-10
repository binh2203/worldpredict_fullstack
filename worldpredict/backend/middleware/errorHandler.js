// ─── Global error handler ─────────────────────────────────────────────────────
// Đặt sau tất cả routes trong server.js
function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err.message);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Lỗi server nội bộ" });
}

module.exports = errorHandler;
