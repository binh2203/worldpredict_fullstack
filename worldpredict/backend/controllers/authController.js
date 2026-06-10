const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { getPool } = require("../config/db");

// POST /api/auth/login
async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Vui lòng nhập đủ thông tin" });

  const pool   = await getPool();
  const result = await pool.query(
    "SELECT * FROM users WHERE Username = $1",
    [username.trim()]
  );

  const user = result.rows[0];
  if (!user)          return res.status(401).json({ message: "Sai tên đăng nhập hoặc mật khẩu" });
  if (!user.isactive) return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hoá" });

  const ok = await bcrypt.compare(password, user.passwordhash);
  if (!ok) return res.status(401).json({ message: "Sai tên đăng nhập hoặc mật khẩu" });

  res.json({ token: signToken(user), user: safeUser(user) });
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function safeUser(u) {
  return {
    id:       u.id,
    username: u.username,
    fullName: u.fullname,
    phone:    u.phone    || "",
    role:     u.role,
    points:   u.points   || 0,
    isActive: !!u.isactive,
  };
}

// PUT /api/auth/change-password  (yêu cầu đăng nhập)
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: "Vui lòng nhập đủ thông tin" });
  if (newPassword.length < 6)
    return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });

  const pool   = await getPool();
  const result = await pool.query("SELECT * FROM users WHERE Id = $1", [req.user.id]);
  const user   = result.rows[0];
  if (!user) return res.status(404).json({ message: "Không tìm thấy tài khoản" });

  const ok = await bcrypt.compare(currentPassword, user.passwordhash);
  if (!ok) return res.status(401).json({ message: "Mật khẩu hiện tại không đúng" });

  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET PasswordHash = $1 WHERE Id = $2", [newHash, req.user.id]);

  res.json({ message: "Đổi mật khẩu thành công" });
}

module.exports = { login, changePassword, safeUser, signToken };
