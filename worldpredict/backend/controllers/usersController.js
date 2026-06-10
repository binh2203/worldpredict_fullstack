const bcrypt = require("bcryptjs");
const { query } = require("../config/db");

// ─── GET /api/users (admin) ─────────────────────────────────────
async function getUsers(req, res) {
  try {
    const result = await query(`
      SELECT id, username, full_name, phone, role, points, is_active, created_at
      FROM users
      ORDER BY created_at ASC
    `);

    res.json(result.rows.map(safeUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── GET /api/users/my-stats ───────────────────────────────────
async function getMyStats(req, res) {
  try {
    const result = await query(
      `
      SELECT
        u.id,
        u.username,
        u.full_name,
        u.role,
        u.points,
        u.is_active,
        SUM(CASE WHEN pr.reason = 'win' THEN 1 ELSE 0 END) AS correct,
        SUM(CASE WHEN pr.reason = 'lose' THEN 1 ELSE 0 END) AS wrong,
        SUM(CASE WHEN pr.reason = 'no_prediction' THEN 1 ELSE 0 END) AS nopred
      FROM users u
      LEFT JOIN prediction_results pr ON pr.user_id = u.id
      WHERE u.id = $1
      GROUP BY u.id, u.username, u.full_name, u.role, u.points, u.is_active
      `,
      [req.user.id]
    );

    const u = result.rows[0];

    if (!u) {
      return res.status(404).json({
        message: "User không tồn tại",
      });
    }

    const total = (u.correct || 0) + (u.wrong || 0);

    res.json({
      ...safeUser(u),
      correct: u.correct || 0,
      wrong: u.wrong || 0,
      noPred: u.nopred || 0,
      accuracy:
        total > 0
          ? Math.round((u.correct / total) * 100)
          : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── POST /api/users (admin create) ─────────────────────────────
async function createUser(req, res) {
  const { username, password, fullName, phone } = req.body;

  if (!username?.trim() || !password) {
    return res.status(400).json({
      message: "Thiếu thông tin bắt buộc",
    });
  }

  try {
    const exists = await query(
      `SELECT 1 FROM users WHERE username = $1`,
      [username.trim()]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({
        message: "Tên đăng nhập đã tồn tại",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await query(
      `
      INSERT INTO users (
        username,
        password,
        full_name,
        phone
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, full_name, phone, role, points, is_active
      `,
      [
        username.trim(),
        hash,
        fullName || username.trim(),
        phone || "",
      ]
    );

    res.status(201).json(safeUser(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── PUT /api/users/:id/toggle-active ───────────────────────────
async function toggleUserActive(req, res) {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({
      message:
        "Không thể tự vô hiệu hoá chính mình",
    });
  }

  try {
    const result = await query(
      `
      UPDATE users
      SET is_active = NOT is_active
      WHERE id = $1 AND role != 'admin'
      RETURNING id, username, is_active
      `,
      [id]
    );

    const u = result.rows[0];

    if (!u) {
      return res.status(404).json({
        message:
          "Không tìm thấy user hoặc không được phép",
      });
    }

    res.json({
      message: `${
        u.is_active ? "Đã kích hoạt" : "Đã vô hiệu hoá"
      } ${u.username}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── GET /api/leaderboard ───────────────────────────────────────
async function getLeaderboard(req, res) {
  try {
    const result = await query(`
      SELECT
        u.id,
        u.username,
        u.full_name,
        u.points,
        SUM(CASE WHEN pr.reason='win' THEN 1 ELSE 0 END) AS correct,
        SUM(CASE WHEN pr.reason='lose' THEN 1 ELSE 0 END) AS wrong,
        SUM(CASE WHEN pr.reason='no_prediction' THEN 1 ELSE 0 END) AS nopred
      FROM users u
      LEFT JOIN prediction_results pr ON pr.user_id = u.id
      WHERE u.role='user' AND u.is_active=true
      GROUP BY u.id, u.username, u.full_name, u.points
      ORDER BY u.points DESC, correct DESC
    `);

    res.json(
      result.rows.map((u) => {
        const total =
          (u.correct || 0) + (u.wrong || 0);

        return {
          id: u.id,
          username: u.username,
          fullName: u.full_name,
          points: u.points || 0,
          correct: u.correct || 0,
          wrong: u.wrong || 0,
          noPred: u.nopred || 0,
          accuracy:
            total > 0
              ? Math.round(
                  (u.correct / total) * 100
                )
              : 0,
        };
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── SAFE USER ───────────────────────────────────────────────────
function safeUser(u) {
  return {
    id: u.id,
    username: u.username,
    fullName: u.full_name,
    phone: u.phone || "",
    role: u.role,
    points: u.points || 0,
    isActive: u.is_active,
    createdAt: u.created_at,
  };
}

module.exports = {
  getUsers,
  getMyStats,
  createUser,
  toggleUserActive,
  getLeaderboard,
};