function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err);

  const status = err.status || err.statusCode || 500;

  // tránh leak stack trace ra client (production best practice)
  const message =
    err.message || "Lỗi server nội bộ";

  res.status(status).json({
    message,
  });
}

module.exports = errorHandler;