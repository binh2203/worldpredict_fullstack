import { C } from "../styles/theme";
import { matchStatusType, getMatchResult, fmtDate, fmtTime, fmtDateTime, getCountdown } from "../utils/helpers";
import { DEFAULT_BET_RULES } from "../constants";

// ─── HANDICAP LABEL HELPER ────────────────────────────────────────────────────
// Theo OddsAPI: point âm = đội đó chấp (đội mạnh hơn)
// m.handicap lưu point của home team
// home < 0 → home chấp away
// home > 0 → away chấp home
function handicapLabel(m) {
  const h = m.handicap;
  if (h === null || h === undefined) return "";
  if (h < 0) return `${m.homeTeam?.name} chấp ${Math.abs(h)}`;
  if (h > 0) return `${m.awayTeam?.name} chấp ${h}`;
  return "Kèo bằng (0)";
}

// ─── MATCH CARD ───────────────────────────────────────────────────────────────

export default function MatchCard({
  m,
  showAdmin,
  currentUser,
  betRules,
  predResults,
  getUserPred,
  doPredict,
  setModal,
}) {
  const st       = matchStatusType(m);
  const isLive   = st === "live";
  const isDone   = st === "done";
  const isLocked = m.isLocked || isLive || isDone;
  const myPred   = currentUser ? getUserPred(m.id) : null;
  const myResult = predResults.find(r => r.userId === currentUser?.id && r.matchId === m.id);
  const hasHcap  = m.handicap !== null && m.handicap !== undefined;
  const rule     = betRules[m.round] || betRules["Vòng bảng"] || DEFAULT_BET_RULES["Vòng bảng"];
  const countdown     = !isLocked ? getCountdown(m.matchDate) : null;
  const almostLocked  = countdown && parseInt(countdown) <= 60 && !countdown.includes("h");
  const actualResult  = isDone ? getMatchResult(m.homeGoals, m.awayGoals, m.handicap) : null;

  function ChoiceBtn({ value, label, logo }) {
    const isSelected = myPred?.choice === value;
    const pointText =
      rule &&
      (value === actualResult
        ? `+${rule.winPoints} điểm`
        : isDone
        ? `-${rule.losePoints} điểm`
        : null);

    return (
      <button
        className={`pred-opt${isSelected ? ` ${value}-sel selected` : ""}`}
        disabled={isLocked || !currentUser || currentUser.role === "admin"}
        onClick={() => doPredict(m.id, value)}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {logo && <img src={logo} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />}
          <span>{label}</span>
        </div>

        {pointText && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2, fontFamily: "Barlow" }}>
            {pointText}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className={`card match-card ${m.resultLocked ? "card-red" : almostLocked ? "card-gold" : ""}`}>
      {isLive && <div className="match-card-live-bar" />}
      {!isDone && isLocked && !isLive && <div className="match-card-locked-bar" />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 6, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, color: C.textFaint }}>
          {fmtDate(m.matchDate)} · {fmtTime(m.matchDate)}
          <span style={{ marginLeft: 8, color: C.goldDim }}>{m.round || ""}</span>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          {hasHcap && (
            <span className="badge badge-hcap">
              {handicapLabel(m)}
            </span>
          )}
          {isLive  && <span className="badge badge-live"><span className="live-dot" /> Live</span>}
          {isDone  && !m.resultLocked && <span className="badge badge-done">KT</span>}
          {m.resultLocked && <span className="badge badge-sealed">🔒 Niêm phong</span>}
          {!isLive && !isDone && isLocked && <span className="badge badge-locked">🔒 Đã khoá</span>}
          {!isLive && !isDone && !isLocked && countdown && (
            <span className="badge badge-upcoming" style={{ color: almostLocked ? C.orange : C.blue }}>
              ⏱ {countdown}
            </span>
          )}
        </div>
      </div>

      {/* Teams + Score */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="team-section" style={{ flex: 1, justifyContent: "flex-start" }}>
          {m.homeTeam?.logo && <img src={m.homeTeam.logo} alt="" className="team-logo" />}
          <span className="team-name">{m.homeTeam?.name}</span>
        </div>
        <div style={{ textAlign: "center", minWidth: 80 }}>
          {(isLive || isDone) && m.homeGoals !== null
            ? <div className="score-big">{m.homeGoals} — {m.awayGoals}</div>
            : <div className="vs-text">VS</div>}
        </div>
        <div className="team-section" style={{ flex: 1, justifyContent: "flex-end" }}>
          <span className="team-name" style={{ textAlign: "right" }}>{m.awayTeam?.name}</span>
          {m.awayTeam?.logo && <img src={m.awayTeam.logo} alt="" className="team-logo" />}
        </div>
      </div>

      {/* Handicap info */}
      {hasHcap && (
        <div className="hcap-box" style={{ marginTop: 10, fontSize: 12 }}>
          🎲 Kèo: {handicapLabel(m)}
          {isDone && actualResult && (
            <span style={{ marginLeft: 8, color: C.gold }}>
              →{" "}
              {actualResult === "home"
                ? `🏠 ${m.homeTeam?.name} thắng kèo`
                : actualResult === "away"
                ? `✈️ ${m.awayTeam?.name} thắng kèo`
                : "🤝 Hòa kèo (không ai thắng)"}
            </span>
          )}
        </div>
      )}

      {/* Bet rule info */}
      {rule && !isDone && !isLocked && (
        <div className="bet-rule-box" style={{ marginTop: 10 }}>
          💰 {m.round}: Đoán đúng{" "}
          <span style={{ color: C.green }}> {rule.winPoints} điểm</span> · đoán sai{" "}
          <span style={{ color: C.red }}> -{rule.losePoints} điểm</span> · không đoán{" "}
          <span style={{ color: C.orange }}> -{rule.defaultLosePoints} điểm</span>
        </div>
      )}

      {/* Prediction buttons */}
      {currentUser && currentUser.role === "user" && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 6, fontFamily: "Barlow Condensed", letterSpacing: "1px", textTransform: "uppercase" }}>
            {isLocked ? "🔒 Đã khóa dự đoán" : hasHcap ? "Dự đoán kèo chấp" : "Dự đoán kết quả"}
          </div>
          <div className="pred-opts">
            <ChoiceBtn
              value="home"
              logo={m.homeTeam?.logo}
              label={hasHcap ? `${m.homeTeam?.name} Thắng Kèo` : m.homeTeam?.name}
            />
            <ChoiceBtn
              value="away"
              logo={m.awayTeam?.logo}
              label={hasHcap ? `${m.awayTeam?.name} Thắng Kèo` : m.awayTeam?.name}
            />
          </div>
        </div>
      )}

      {/* Result feedback */}
      {myPred && (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 7, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, color: C.textDim }}>
            Dự đoán: <b style={{ color: C.text }}>
              {myPred.choice === "home" ? `🏠 ${m.homeTeam?.name}` : `✈️ ${m.awayTeam?.name}`}
            </b>
          </span>
          {myResult
            ? <span className={`badge ${myResult.reason === "win" ? "badge-correct" : "badge-wrong"}`}>
                {myResult.reason === "win"
                  ? `✓ +${myResult.pointChange} điểm`
                  : `✗ ${myResult.pointChange} điểm`}
              </span>
            : isDone
              ? <span className="badge badge-wrong">✗ Đang tính...</span>
              : <span className="badge badge-pending">⏳ Chờ</span>}
        </div>
      )}

      {/* No prediction warning */}
      {currentUser?.role === "user" && !myPred && !isDone && isLocked && (
        <div className="lock-warning" style={{ marginTop: 10 }}>
          ⚠️ Bạn chưa dự đoán — sẽ bị trừ <b>{rule?.defaultLosePoints || 0} điểm</b> mặc định
        </div>
      )}

      {/* Sealed notice */}
      {m.resultLocked && (
        <div className="sealed-warning" style={{ marginTop: 10 }}>
          🔐 Kết quả đã niêm phong lúc {fmtDateTime(m.resultSetAt)} — không thể thay đổi
        </div>
      )}

      {/* Admin controls */}
      {showAdmin && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {!m.resultLocked && (
            <button className="btn btn-outline btn-sm" onClick={() => setModal({ type: "result", data: { m } })}>
              📝 Nhập KQ
            </button>
          )}
          {m.resultLocked && <span style={{ fontSize: 11, color: C.red, padding: "4px 0" }}>🔒 Kết quả đã niêm phong</span>}
          {!m.isLocked && !m.resultLocked && (
            <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: "handicap", data: { m } })}>
              🎲 Kèo chấp
            </button>
          )}
        </div>
      )}
    </div>
  );
}
