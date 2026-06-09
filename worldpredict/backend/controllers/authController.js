const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { getPool, sql } = require("../config/db");

// POST /api/auth/login
async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Vui lòng nhập đủ thông tin" });

  const pool   = await getPool();
  const result = await pool.request()
    .input("username", sql.NVarChar, username.trim())
    .query("SELECT * FROM Users WHERE Username = @username");

  const user = result.recordset[0];
  if (!user)          return res.status(401).json({ message: "Sai tên đăng nhập hoặc mật khẩu" });
  if (!user.IsActive) return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hoá" });

    const ok = await bcrypt.compare(password, user.Password);
  if (!ok) return res.status(401).json({ message: "Sai tên đăng nhập hoặc mật khẩu" });

  res.json({ token: signToken(user), user: safeUser(user) });
}

// Helpers
function signToken(user) {
  return jwt.sign(
    { id: user.Id, username: user.Username, role: user.Role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function safeUser(u) {
  return {
    id:       u.Id,
    username: u.Username,
    fullName: u.FullName,
    phone:    u.Phone    || "",
    role:     u.Role,
    points:   u.Points   || 0,   // ← Points (không phải Balance)
    isActive: !!u.IsActive,
  };
}

module.exports = { login, safeUser, signToken };
