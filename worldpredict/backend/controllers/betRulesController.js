const { query } = require("../config/db");

// ─── GET /api/betrules ─────────────────────────────────────────────
async function getBetRules(req, res) {
  try {
    const result = await query(
      `SELECT round, win_amount, draw_amount, lose_amount, default_lose_amount FROM bet_rules`
    );

    const rules = {};

    for (const r of result.rows) {
      rules[r.round] = {
        winAmount: Number(r.win_amount),
        drawAmount: Number(r.draw_amount),
        loseAmount: Number(r.lose_amount),
        defaultLoseAmount: Number(r.default_lose_amount),
      };
    }

    res.json(rules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ─── PUT /api/betrules ────────────────────────────────────────────
async function saveBetRule(req, res) {
  const {
    round,
    winAmount,
    drawAmount,
    loseAmount,
    defaultLoseAmount,
  } = req.body;

  if (!round) {
    return res.status(400).json({ message: "Thiếu tên vòng đấu" });
  }

  try {
    await query(
      `
      INSERT INTO bet_rules (
        round,
        win_amount,
        draw_amount,
        lose_amount,
        default_lose_amount
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (round)
      DO UPDATE SET
        win_amount = EXCLUDED.win_amount,
        draw_amount = EXCLUDED.draw_amount,
        lose_amount = EXCLUDED.lose_amount,
        default_lose_amount = EXCLUDED.default_lose_amount
      `,
      [
        round,
        winAmount || 0,
        drawAmount || 0,
        loseAmount || 0,
        defaultLoseAmount || 0,
      ]
    );

    res.json({ message: `Đã lưu quy tắc tiền cược vòng ${round}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = { getBetRules, saveBetRule };