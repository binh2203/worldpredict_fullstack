import { ROUNDS } from "../constants";
import MatchCard from "../components/MatchCard";

// ─── PAGE MATCHES ─────────────────────────────────────────────────────────────

export default function PageMatches({
  filteredMatches, roundFilter, setRoundFilter,
  statusFilter, setStatusFilter,
  currentUser, betRules, predResults,
  getUserPred, doPredict, setModal,
}) {
  const matchCardProps = { currentUser, betRules, predResults, getUserPred, doPredict, setModal };

  return (
    <div className="wrap section">
      <div className="section-head">
        <div className="section-title">📅 <span>Lịch thi đấu</span></div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div className="round-chips">
          {["all", ...ROUNDS].map(r => (
            <button
              key={r}
              className={`round-chip ${roundFilter === r ? "active" : ""}`}
              onClick={() => setRoundFilter(r)}
            >
              {r === "all" ? "Tất cả" : r}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {[
            { v: "all",      l: "Tất cả" },
            { v: "upcoming", l: "Sắp tới" },
            { v: "live",     l: "🔴 Live" },
            { v: "done",     l: "Kết thúc" },
          ].map(f => (
            <button
              key={f.v}
              className={`round-chip ${statusFilter === f.v ? "active" : ""}`}
              onClick={() => setStatusFilter(f.v)}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {filteredMatches.length === 0
        ? <div style={{ color: "rgba(237,232,216,0.3)", padding: 40, textAlign: "center" }}>Không có trận phù hợp</div>
        : (
          <div className="grid-2">
            {filteredMatches.map(m => (
              <MatchCard key={m.id} m={m} showAdmin={currentUser?.role === "admin"} {...matchCardProps} />
            ))}
          </div>
        )}
    </div>
  );
}
