import { useState, useEffect } from "react";
import { C } from "../styles/theme";
import MatchCard from "../components/MatchCard";
import { API_URL } from "../constants";

// ─── PAGE HOME ────────────────────────────────────────────────────────────────

export default function PageHome({
  matches, currentUser, betRules, predResults,
  getUserPred, doPredict, setModal, setPage,
  leaderboard, myLbEntry, myRank,
  users, predictions,
}) {
  const liveMatches = matches.filter(m => ["1H","2H","HT","ET","BT","P","INT"].includes(m.status));
  const upcoming    = matches.filter(m => !["FT","AET","PEN"].includes(m.status) && !["1H","2H","HT","ET","BT","P","INT"].includes(m.status));

  // ── WC Group Stage stats (từ API Football) ──────────────────────────────
  const [wcStats, setWcStats] = useState(null);
  useEffect(() => {
    fetch(`${API_URL}/wc-fixtures`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.groupStats ? setWcStats(d.groupStats) : null)
      .catch(() => {});
  }, []);

  const matchCardProps = { currentUser, betRules, predResults, getUserPred, doPredict, setModal };

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div style={{ fontFamily: "Barlow Condensed", fontSize: 12, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: C.goldDim, marginBottom: 14 }}>
          ⚽ USA · Canada · Mexico · 2026
        </div>
        <h1 className="hero-title">World Cup<br /><em>Predict</em></h1>
        <p className="hero-sub">Dự đoán — Công bằng</p>
        {!currentUser && (
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            {/* Chỉ hiện nút Đăng nhập — tài khoản do Admin cấp */}
            <button className="btn btn-gold" onClick={() => setModal({ type: "login" })}>
              🔐 Đăng nhập
            </button>
          </div>
        )}
        {!currentUser && (
          <p style={{ color: C.textFaint, fontSize: 12, marginTop: 10, letterSpacing: 1 }}>
            Tài khoản do Admin cấp · Liên hệ quản trị viên để tham gia
          </p>
        )}
      </div>

      <div className="wrap">
        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 28 }}>
          {[
            { n: matches.length,                          l: "Trận đấu",    i: "🏟️" },
            { n: users.filter(u => u.role === "user").length, l: "Người chơi", i: "👥" },
            { n: predictions.length,                     l: "Dự đoán",     i: "🎯" },
            { n: myRank || "—",                          l: "Hạng của bạn",i: "🏆" },
          ].map((s, i) => (
            <div key={i} className="card stat-box">
              <div style={{ fontSize: 24, marginBottom: 4 }}>{s.i}</div>
              <div className="stat-num">{s.n}</div>
              <div className="stat-label">{s.l}</div>
            </div>
          ))}
        </div>

        {/* My points card */}
        {currentUser && currentUser.role === "user" && myLbEntry && (
          <div className="card card-gold" style={{ padding: "18px 22px", marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontFamily: "Oswald", fontSize: 20, fontWeight: 700, color: C.gold, marginBottom: 4 }}>
                  {currentUser.fullName}
                </div>
                <div style={{ fontSize: 13, color: C.textDim }}>
                  {myLbEntry.correct} đúng · {myLbEntry.wrong} sai · {myLbEntry.noPred} không cá · Hạng #{myRank}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "Oswald", fontSize: 40, fontWeight: 700, color: (currentUser.points || 0) >= 0 ? C.green : C.red, lineHeight: 1 }}>
                  {(currentUser.points || 0) >= 0 ? "+" : ""}{currentUser.points || 0} điểm
                </div>
                <div style={{ fontSize: 11, color: C.textFaint, letterSpacing: 1 }}>TỔNG ĐIỂM</div>
              </div>
            </div>
          </div>
        )}

        {/* WC Group Stage stats */}
        {wcStats && wcStats.done > 0 && (
          <div className="card" style={{ padding: "16px 20px", marginBottom: 24, border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: "Barlow Condensed", fontSize: 12, fontWeight: 700, letterSpacing: 2, color: C.goldDim, marginBottom: 12, textTransform: "uppercase" }}>
              ⚽ Vòng bảng WC2026 — Tổng kết
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                { label: "Tổng trận đã đấu", value: wcStats.done,     color: C.text    },
                { label: "Nhà thắng",         value: wcStats.homeWins, color: C.green   },
                { label: "Khách thắng",        value: wcStats.awayWins, color: C.blue    },
                { label: "Hòa",                value: wcStats.draws,    color: C.goldDim },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", minWidth: 72 }}>
                  <div style={{ fontFamily: "Oswald", fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
              <div style={{ marginLeft: "auto", alignSelf: "center", fontSize: 12, color: C.textFaint }}>
                {wcStats.total} trận tổng cộng
              </div>
            </div>
          </div>
        )}

        {/* Live matches */}
        {liveMatches.length > 0 && (
          <div className="section">
            <div className="section-head">
              <div className="section-title"><span className="live-dot" style={{ marginRight: 8 }} /><span>Đang diễn ra</span></div>
            </div>
            <div className="grid-2">
              {liveMatches.map(m => <MatchCard key={m.id} m={m} showAdmin={false} {...matchCardProps} />)}
            </div>
          </div>
        )}

        {/* Upcoming */}
        <div className="section">
          <div className="section-head">
            <div className="section-title">📅 <span>Sắp diễn ra</span></div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage("matches")}>Xem tất cả →</button>
          </div>
          {upcoming.length === 0
            ? <div style={{ color: C.textFaint, padding: 20 }}>Không có trận sắp diễn ra</div>
            : (
              <div className="grid-3">
                {upcoming.slice(0, 6).map(m => <MatchCard key={m.id} m={m} showAdmin={false} {...matchCardProps} />)}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
