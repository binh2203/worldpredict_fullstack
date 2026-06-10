const jwt = require("jsonwebtoken");

// ─── Verify JWT ───────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Thiếu token xác thực" });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, username, role }
    next();
  } catch {
    return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
}

// ─── Require admin role ───────────────────────────────────────────────────────
function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Chỉ Admin mới được thực hiện thao tác này" });
  }
  next();
}

module.exports = { authMiddleware, adminOnly };
