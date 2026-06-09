import { C } from "../styles/theme";

// ─── PAGE LEADERBOARD ─────────────────────────────────────────────────────────

export default function PageLeaderboard({ leaderboard, currentUser }) {
  return (
    <div className="wrap section">
      <div className="section-head">
        <div className="section-title">🏆 <span>Bảng xếp hạng</span></div>
      </div>

      {/* Podium top 3 */}
      {leaderboard.length >= 3 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr 1fr", gap: 12, marginBottom: 24 }}>
          {[1, 0, 2].map(idx => {
            const u = leaderboard[idx];
            if (!u) return <div key={idx} />;
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <div
                key={idx}
                className={`card ${u.id === currentUser?.id ? "card-gold" : ""}`}
                style={{ padding: 20, textAlign: "center", ...(idx === 0 ? { marginTop: -10 } : {}) }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{medals[idx]}</div>
                <div style={{ fontFamily: "Oswald", fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                  {u.fullName}
                </div>
                <div style={{ fontFamily: "Oswald", fontSize: 28, fontWeight: 700, color: (u.points || 0) >= 0 ? C.green : C.red, lineHeight: 1 }}>
                  {(u.points || 0) >= 0 ? "+" : ""}{u.points || 0} điểm
                </div>
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>
                  {u.correct}✓ {u.wrong}✗ {u.noPred}⊘
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Người chơi</th><th>Số dư</th>
                <th>Đúng</th><th>Sai</th><th>Không cá</th><th>Tỷ lệ</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((u, i) => (
                <tr key={u.id} className={u.id === currentUser?.id ? "me" : ""}>
                  <td><span className={`rank-num rank-${i + 1}`}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span></td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{u.fullName}</span>
                    {u.id === currentUser?.id && <span style={{ fontSize: 11, color: C.goldDim, marginLeft: 8 }}>(bạn)</span>}
                  </td>
                  <td>
                    <span className={(u.points || 0) >= 0 ? "money-positive" : "money-negative"}>
                      {(u.points || 0) >= 0 ? "+" : ""}{u.points || 0} điểm
                    </span>
                  </td>
                  <td><span style={{ color: C.green, fontWeight: 600 }}>{u.correct}</span></td>
                  <td><span style={{ color: C.red,   fontWeight: 600 }}>{u.wrong}</span></td>
                  <td><span style={{ color: C.orange }}>{u.noPred}</span></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 80 }}>
                      <div className="progress-track" style={{ flex: 1 }}>
                        <div className="progress-fill" style={{ width: `${u.accuracy}%` }} />
                      </div>
                      <span style={{ fontSize: 12, color: C.textDim, minWidth: 34 }}>{u.accuracy}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: C.textFaint, padding: 30 }}>Chưa có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
