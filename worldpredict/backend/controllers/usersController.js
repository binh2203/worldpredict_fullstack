const bcrypt = require("bcryptjs");
const { getPool, sql } = require("../config/db");

// GET /api/users (admin only)
async function getUsers(req, res) {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT Id, Username, FullName, Phone, Role, Points, IsActive, CreatedAt
    FROM Users ORDER BY CreatedAt ASC
  `);
  res.json(result.recordset.map(safeUser));
}

// GET /api/users/my-stats
async function getMyStats(req, res) {
  const pool = await getPool();
  const result = await pool.request()
    .input("userId", sql.Int, req.user.id)
    .query(`
      SELECT
        u.Id, u.Username, u.FullName, u.Role, u.Points, u.IsActive,
        SUM(CASE WHEN pr.Reason='win'           THEN 1 ELSE 0 END) AS Correct,
        SUM(CASE WHEN pr.Reason='lose'          THEN 1 ELSE 0 END) AS Wrong,
        SUM(CASE WHEN pr.Reason='no_prediction' THEN 1 ELSE 0 END) AS NoPred
      FROM Users u
      LEFT JOIN PredictionResults pr ON pr.UserId=u.Id
      WHERE u.Id=@userId
      GROUP BY u.Id, u.Username, u.FullName, u.Role, u.Points, u.IsActive
    `);
  if (!result.recordset[0]) return res.status(404).json({ message: "User không tồn tại" });
  const u = result.recordset[0];
  const total = (u.Correct || 0) + (u.Wrong || 0);
  res.json({
    ...safeUser(u),
    correct:  u.Correct || 0,
    wrong:    u.Wrong   || 0,
    noPred:   u.NoPred  || 0,
    accuracy: total > 0 ? Math.round(u.Correct / total * 100) : 0,
  });
}

// POST /api/users (admin only) — tạo tài khoản thay vì self-register
async function createUser(req, res) {
  const { username, password, fullName, phone } = req.body;
  if (!username?.trim() || !password)
    return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });

  const pool = await getPool();
  const exists = await pool.request()
    .input("username", sql.NVarChar, username.trim())
    .query("SELECT 1 FROM Users WHERE Username=@username");
  if (exists.recordset.length > 0)
    return res.status(409).json({ message: "Tên đăng nhập đã tồn tại" });

  const hash   = await bcrypt.hash(password, 10);
  const result = await pool.request()
    .input("username", sql.NVarChar, username.trim())
    .input("password", sql.NVarChar, hash)
    .input("fullName", sql.NVarChar, fullName || username.trim())
    .input("phone",    sql.NVarChar, phone    || "")
    .query(`
      INSERT INTO Users (Username, PasswordHash, FullName, Phone)
      OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.FullName,
             INSERTED.Phone, INSERTED.Role, INSERTED.Points, INSERTED.IsActive
      VALUES (@username, @password, @fullName, @phone)
    `);
  res.status(201).json(safeUser(result.recordset[0]));
}

// PUT /api/users/:id/toggle-active (admin only)
async function toggleUserActive(req, res) {
  const { id } = req.params;
  if (parseInt(id) === req.user.id)
    return res.status(400).json({ message: "Không thể tự vô hiệu hoá chính mình" });

  const pool   = await getPool();
  const result = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      UPDATE Users SET IsActive = 1 - IsActive
      OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.IsActive
      WHERE Id=@id AND Role != 'admin'
    `);
  if (!result.recordset.length)
    return res.status(404).json({ message: "Không tìm thấy user hoặc không được phép" });

  const u = result.recordset[0];
  res.json({ message: `${u.IsActive ? "Đã kích hoạt" : "Đã vô hiệu hoá"} ${u.Username}` });
}

// GET /api/leaderboard
async function getLeaderboard(req, res) {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      u.Id, u.Username, u.FullName, u.Points,
      SUM(CASE WHEN pr.Reason='win'           THEN 1 ELSE 0 END) AS Correct,
      SUM(CASE WHEN pr.Reason='lose'          THEN 1 ELSE 0 END) AS Wrong,
      SUM(CASE WHEN pr.Reason='no_prediction' THEN 1 ELSE 0 END) AS NoPred
    FROM Users u
    LEFT JOIN PredictionResults pr ON pr.UserId=u.Id
    WHERE u.Role='user' AND u.IsActive=1
    GROUP BY u.Id, u.Username, u.FullName, u.Points
    ORDER BY u.Points DESC, Correct DESC
  `);
  res.json(result.recordset.map(u => {
    const total = (u.Correct || 0) + (u.Wrong || 0);
    return {
      id:       u.Id,
      username: u.Username,
      fullName: u.FullName,
      points:   u.Points   || 0,   // ← points (frontend dùng key này)
      correct:  u.Correct  || 0,
      wrong:    u.Wrong    || 0,
      noPred:   u.NoPred   || 0,
      accuracy: total > 0 ? Math.round(u.Correct / total * 100) : 0,
    };
  }));
}

function safeUser(u) {
  return {
    id:        u.Id,
    username:  u.Username,
    fullName:  u.FullName,
    phone:     u.Phone     || "",
    role:      u.Role,
    points:    u.Points    || 0,
    isActive:  !!u.IsActive,
    createdAt: u.CreatedAt,
  };
}

module.exports = { getUsers, getMyStats, createUser, toggleUserActive, getLeaderboard };
