import { useState } from "react";
import { ROUNDS } from "../constants";
import { C } from "../styles/theme";
import { fmtDate, fmtMoney, getMatchResult } from "../utils/helpers";

// ─── PAGE HISTORY ─────────────────────────────────────────────────────────────

export default function PageHistory({
  currentUser, predictions, matches, predResults, myLbEntry, setModal,
}) {
  const [activeRound, setActiveRound] = useState("all");

  if (!currentUser) return (
    <div className="wrap section" style={{ textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ color: C.textDim }}>Đăng nhập để xem lịch sử</div>
      <button className="btn btn-gold" style={{ marginTop: 20 }} onClick={() => setModal({ type: "login" })}>
        Đăng nhập
      </button>
    </div>
  );

  const myPreds = predictions.filter(p => p.userId === currentUser.id).map(p => {
    const m = matches.find(m => m.id === p.matchId);
    if (!m) return null;
    const r = predResults.find(r => r.userId === currentUser.id && r.matchId === m.id);
    return { ...p, match: m, result: r };
  }).filter(Boolean);

  const myNoPreds = predResults
    .filter(r => r.userId === currentUser.id && r.reason === "no_prediction")
    .map(r => {
      const m = matches.find(m => m.id === r.matchId);
      return m ? { match: m, result: r, noPred: true } : null;
    }).filter(Boolean);

  const allItems = [...myPreds, ...myNoPreds];
  const filtered = (activeRound === "all" ? allItems : allItems.filter(p => p.match.round === activeRound))
    .sort((a, b) => {
      const aDone = a.match.resultLocked;
      const bDone = b.match.resultLocked;
      if (aDone !== bDone) return aDone ? 1 : -1;
      return new Date(a.match.matchDate) - new Date(b.match.matchDate);
    });

  return (
    <div className="wrap section">
      <div className="section-head">
        <div className="section-title">📜 <span>Lịch sử & Điểm</span></div>
        <div style={{ fontFamily: "Oswald", fontSize: 24, fontWeight: 700, color: (currentUser.points || 0) >= 0 ? C.green : C.red }}>
          Tổng điểm: {(currentUser.points || 0) >= 0 ? "+" : ""}{currentUser.points || 0} điểm
        </div>
      </div>

      {/* Round stats table */}
      {myLbEntry && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "140px repeat(4,1fr)", minWidth: 520 }}>
              {["Vòng đấu", "Thắng", "Thua", "Không cá", "Điểm"].map(h => (
                <div key={h} style={{ fontFamily: "Barlow Condensed", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.goldDim, padding: "8px 10px", borderBottom: `1px solid ${C.border}` }}>
                  {h}
                </div>
              ))}
              {ROUNDS.map(r => {
                const rs = myLbEntry.roundStats[r] || { correct: 0, wrong: 0, noPred: 0, money: 0 };
                return (
                  <div key={r} style={{ display: "contents" }}>
                    <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, padding: "10px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>{r}</div>
                    <div style={{ color: C.green,  padding: "10px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>{rs.correct}</div>
                    <div style={{ color: C.red,    padding: "10px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>{rs.wrong}</div>
                    <div style={{ color: C.orange, padding: "10px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>{rs.noPred || 0}</div>
                    <div style={{ color: (rs.money || 0) >= 0 ? C.green : C.red, fontWeight: 700, fontFamily: "Oswald", padding: "10px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                      {(rs.points || rs.money || 0) >= 0 ? "+" : ""}{rs.points ?? rs.money ?? 0} điểm
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Round filter tabs */}
      <div className="tab-row">
        {["all", ...ROUNDS].map(r => (
          <button key={r} className={`tab-btn ${activeRound === r ? "active" : ""}`} onClick={() => setActiveRound(r)}>
            {r === "all" ? "Tất cả" : r}
          </button>
        ))}
      </div>

      {/* Items list */}
      {filtered.length === 0
        ? <div style={{ color: C.textFaint, padding: 30, textAlign: "center" }}>Chưa có dữ liệu</div>
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((p, i) => {
              const isNP = p.noPred;
              const r    = p.result;
              return (
                <div key={i} className="card" style={{ padding: "14px 18px" }}>
                  <div className="history-card-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 3 }}>
                        {p.match.homeTeam?.name} <span style={{ color: C.textFaint }}>vs</span> {p.match.awayTeam?.name}
                      </div>
                      <div style={{ fontSize: 12, color: C.textFaint }}>
                        {fmtDate(p.match.matchDate)} · {p.match.round}
                        {p.match.handicap && <span className="badge badge-hcap" style={{ marginLeft: 8 }}>Kèo</span>}
                        {!p.match.resultLocked && <span className="badge badge-upcoming" style={{ marginLeft: 8 }}>⏳ Sắp tới</span>}
                      </div>
                    </div>
                    <div className="history-card-right" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    {!isNP && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 2 }}>Dự đoán</div>
                        <div style={{ fontWeight: 700 }}>
                          {p.choice === "home" ? "🏠 Nhà" : "✈️ Khách"}
                        </div>
                      </div>
                    )}
                    {isNP && <span className="badge badge-no-pred badge" style={{ padding: "4px 10px" }}>⊘ Không cá</span>}
                    {p.match.resultLocked && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 2 }}>Tỷ số</div>
                        <div style={{ fontFamily: "Oswald", fontWeight: 700, color: C.gold, fontSize: 18 }}>
                          {p.match.homeGoals} — {p.match.awayGoals}
                        </div>
                      </div>
                    )}
                    {p.match.resultLocked && !isNP && (() => {
                      const actualResult = getMatchResult(p.match.homeGoals, p.match.awayGoals, p.match.handicap);
                      // actualResult null = hòa kèo → không ai thắng → Thua hết
                      const isCorrect = actualResult !== null && p.choice === actualResult;
                      return (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 2 }}>Kết quả</div>
                          {isCorrect
                            ? <span className="badge badge-money-win">✓ Thắng</span>
                            : <span className="badge badge-money-lose">✗ Thua</span>}
                        </div>
                      );
                    })()}
                    {r
                      ? <span className={`badge ${r.reason === "win" ? "badge-money-win" : r.reason === "no_prediction" ? "badge-no-pred" : "badge-money-lose"}`}>
                          {r.reason === "win" ? "✓" : r.reason === "no_prediction" ? "⊘" : "✗"} {fmtMoney(r.pointChange ?? r.moneyChange)}
                        </span>
                      : p.match.resultLocked
                        ? <span className="badge badge-pending">⏳ Đang tính...</span>
                        : <span className="badge badge-pending">⏳ Chờ</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
