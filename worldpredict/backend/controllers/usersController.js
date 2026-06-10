const bcrypt = require("bcryptjs");
const { getPool } = require("../config/db");

// GET /api/users (admin only)
async function getUsers(req, res) {
  const pool = await getPool();
  const result = await pool.query(`
    SELECT Id, Username, FullName, Phone, Role, Points, IsActive, CreatedAt
    FROM Users ORDER BY CreatedAt ASC
  `);
  res.json(result.rows.map(safeUser));
}

// GET /api/users/my-stats
async function getMyStats(req, res) {
  const pool = await getPool();
  const result = await pool.query(`
    SELECT
      u.Id, u.Username, u.FullName, u.Role, u.Points, u.IsActive,
      SUM(CASE WHEN pr.Reason='win'           THEN 1 ELSE 0 END) AS Correct,
      SUM(CASE WHEN pr.Reason='lose'          THEN 1 ELSE 0 END) AS Wrong,
      SUM(CASE WHEN pr.Reason='no_prediction' THEN 1 ELSE 0 END) AS NoPred
    FROM users u
    LEFT JOIN PredictionResults pr ON pr.UserId = u.Id
    WHERE u.Id = $1
    GROUP BY u.Id, u.Username, u.FullName, u.Role, u.Points, u.IsActive
  `, [req.user.id]);

  if (!result.rows[0]) return res.status(404).json({ message: "User không tồn tại" });
  const u = result.rows[0];
  const total = (Number(u.correct) || 0) + (Number(u.wrong) || 0);
  res.json({
    ...safeUser(u),
    correct:  Number(u.correct) || 0,
    wrong:    Number(u.wrong)   || 0,
    noPred:   Number(u.nopred)  || 0,
    accuracy: total > 0 ? Math.round(u.correct / total * 100) : 0,
  });
}

// POST /api/users (admin only)
async function createUser(req, res) {
  const { username, password, fullName, phone } = req.body;
  if (!username?.trim() || !password)
    return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });

  const pool = await getPool();
  const exists = await pool.query(
    "SELECT 1 FROM users WHERE Username = $1",
    [username.trim()]
  );
  if (exists.rows.length > 0)
    return res.status(409).json({ message: "Tên đăng nhập đã tồn tại" });

  const hash   = await bcrypt.hash(password, 10);
  const result = await pool.query(`
    INSERT INTO users (Username, PasswordHash, FullName, Phone)
    VALUES ($1, $2, $3, $4)
    RETURNING Id, Username, FullName, Phone, Role, Points, IsActive
  `, [username.trim(), hash, fullName || username.trim(), phone || ""]);

  res.status(201).json(safeUser(result.rows[0]));
}

// PUT /api/users/:id/toggle-active (admin only)
async function toggleUserActive(req, res) {
  const { id } = req.params;
  if (parseInt(id) === req.user.id)
    return res.status(400).json({ message: "Không thể tự vô hiệu hoá chính mình" });

  const pool   = await getPool();
  const result = await pool.query(`
    UPDATE users SET IsActive = NOT IsActive
    WHERE Id = $1 AND Role != 'admin'
    RETURNING Id, Username, IsActive
  `, [id]);

  if (!result.rows.length)
    return res.status(404).json({ message: "Không tìm thấy user hoặc không được phép" });

  const u = result.rows[0];
  res.json({ message: `${u.isactive ? "Đã kích hoạt" : "Đã vô hiệu hoá"} ${u.username}` });
}

// GET /api/leaderboard
async function getLeaderboard(req, res) {
  const pool = await getPool();
  const result = await pool.query(`
    SELECT
      u.Id, u.Username, u.FullName, u.Points,
      SUM(CASE WHEN pr.Reason='win'           THEN 1 ELSE 0 END) AS Correct,
      SUM(CASE WHEN pr.Reason='lose'          THEN 1 ELSE 0 END) AS Wrong,
      SUM(CASE WHEN pr.Reason='no_prediction' THEN 1 ELSE 0 END) AS NoPred
    FROM users u
    LEFT JOIN PredictionResults pr ON pr.UserId = u.Id
    WHERE u.Role = 'user' AND u.IsActive = TRUE
    GROUP BY u.Id, u.Username, u.FullName, u.Points
    ORDER BY u.Points DESC, Correct DESC
  `);
  res.json(result.rows.map(u => {
    const total = (Number(u.correct) || 0) + (Number(u.wrong) || 0);
    return {
      id:       u.id,
      username: u.username,
      fullName: u.fullname,
      points:   u.points   || 0,
      correct:  Number(u.correct) || 0,
      wrong:    Number(u.wrong)   || 0,
      noPred:   Number(u.nopred)  || 0,
      accuracy: total > 0 ? Math.round(u.correct / total * 100) : 0,
    };
  }));
}

function safeUser(u) {
  return {
    id:        u.id,
    username:  u.username,
    fullName:  u.fullname,
    phone:     u.phone     || "",
    role:      u.role,
    points:    u.points    || 0,
    isActive:  !!u.isactive,
    createdAt: u.createdat,
  };
}

module.exports = { getUsers, getMyStats, createUser, toggleUserActive, getLeaderboard };
