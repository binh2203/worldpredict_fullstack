const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");

// POST /api/auth/login
async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Vui lòng nhập đủ thông tin" });
  }

  try {
    const result = await query(
      `SELECT * FROM users WHERE username = $1`,
      [username.trim()]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Sai tên đăng nhập hoặc mật khẩu" });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hoá" });
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(401).json({ message: "Sai tên đăng nhập hoặc mật khẩu" });
    }

    res.json({
      token: signToken(user),
      user: safeUser(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── JWT ─────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

// ─── SAFE USER ───────────────────────────────────────
function safeUser(u) {
  return {
    id: u.id,
    username: u.username,
    fullName: u.full_name,
    phone: u.phone || "",
    role: u.role,
    points: u.points || 0,
    isActive: u.is_active,
  };
}

module.exports = { login, safeUser, signToken };