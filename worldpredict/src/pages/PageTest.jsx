/**
 * PageTest.jsx
 * Trang test đầy đủ flow: load 2 trận WC hôm nay từ DB → inject vào app →
 * dự đoán → admin nhập kết quả → tính điểm — y chang PageMatches thật.
 */
import { useState, useEffect, useRef } from "react";
import { C } from "../styles/theme";
import api from "../services/api";
import MatchCard from "../components/MatchCard";
import { fmtTime, fmtDate } from "../utils/helpers";

const INJECT_ID_BASE = 7000; // ID giả để không đụng matches thật

// Chuyển trận từ API /today-wc sang format của app (giống matchesController.formatMatch)
function normalizeMatch(m, idx) {
  return {
    ...m,
    id: m._isMock ? INJECT_ID_BASE + idx : m.id,  // dùng ID gốc nếu là trận thật từ DB
  };
}

// ─── PAGE TEST ─────────────────────────────────────────────────────────────────
export default function PageTest({
  // Props từ App.jsx — đủ để dùng MatchCard + logic predict
  currentUser,
  betRules,
  predResults,
  getUserPredOverride,   // function(matchId) — từ local pred state
  doPredictOverride,     // function(matchId, choice) — local
  setModal,
  // inject / eject trận test vào matches chính
  injectTestMatches,
  ejectTestMatches,
  // doSetResult từ store (để admin nhập KQ thật)
  doSetResult,
  showToast,
  // để biết các trận đã inject chưa
  matches: allMatches,
  predictions,
  predResultsGlobal,
}) {
  const [todayMatches, setTodayMatches] = useState(null);  // raw từ API
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [injected, setInjected]         = useState(false);
  const [fetchedAt, setFetchedAt]       = useState(null);
  const [isMock, setIsMock]             = useState(false);

  // Local prediction state — chỉ cho PageTest, không ảnh hưởng matches thật
  // Khi inject, sẽ dùng doPredict của store thay thế
  const injectedIds = useRef([]);

  // ── Load 2 trận hôm nay ────────────────────────────────────────────────────
  async function loadTodayWc() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.call("/test-data/today-wc");
      const normalized = (data.matches || []).map((m, i) => normalizeMatch(m, i));
      setTodayMatches(normalized);
      setFetchedAt(data.fetchedAt);
      setIsMock(!!data.isMock);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTodayWc(); }, []);

  // ── Inject trận vào PageMatches ────────────────────────────────────────────
  function handleInject() {
    if (!todayMatches?.length) return;
    injectedIds.current = todayMatches.map(m => m.id);
    injectTestMatches(todayMatches);
    setInjected(true);
    showToast(`✅ Đã inject ${todayMatches.length} trận test vào Lịch đấu`, "success");
  }

  function handleEject() {
    ejectTestMatches(injectedIds.current);
    setInjected(false);
    showToast("🗑️ Đã xoá trận test khỏi Lịch đấu", "info");
  }

  // Trận đã inject — lấy từ allMatches (state chính) để có status/goals cập nhật
  const liveMatches = injectedIds.current.length > 0
    ? allMatches.filter(m => injectedIds.current.includes(m.id))
    : todayMatches || [];

  const matchCardProps = {
    currentUser,
    betRules,
    predResults: predResultsGlobal,
    getUserPred: (matchId) => predictions?.find(p => p.userId === currentUser?.id && p.matchId === matchId),
    doPredict: doPredictOverride,
    setModal,
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 16px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: C.gold, fontFamily: "Barlow Condensed", fontSize: 30,
          letterSpacing: 2, margin: 0 }}>
          🧪 TEST FLOW — Trận WC Hôm Nay
        </h2>
        <p style={{ color: C.textDim, fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
          Load 2 trận WC hôm nay từ DB → inject vào Lịch đấu → dự đoán → admin nhập kết quả → tính điểm.
          {fetchedAt && (
            <span style={{ color: C.textFaint, marginLeft: 8 }}>
              Cập nhật: {new Date(fetchedAt).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
            </span>
          )}
        </p>
      </div>

      {/* ── Hướng dẫn flow ── */}
      <div style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${C.goldDim}`,
        borderRadius: 10, padding: "14px 18px", marginBottom: 24, fontSize: 13 }}>
        <div style={{ color: C.gold, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
          📋 FLOW TEST:
        </div>
        <div style={{ color: C.textDim, lineHeight: 2 }}>
          <span style={{ color: C.blue }}>①</span> Load trận hôm nay bên dưới &nbsp;→&nbsp;
          <span style={{ color: C.blue }}>②</span> Nhấn <b style={{ color: C.green }}>Inject vào Lịch đấu</b> &nbsp;→&nbsp;
          <span style={{ color: C.blue }}>③</span> Vào tab <b>Lịch đấu</b> dự đoán (user) &nbsp;→&nbsp;
          <span style={{ color: C.blue }}>④</span> Admin nhập kết quả ngay tại đây &nbsp;→&nbsp;
          <span style={{ color: C.blue }}>⑤</span> Kiểm tra điểm trên <b>BXH</b>
        </div>
      </div>

      {/* ── Mock warning ── */}
      {isMock && (
        <div style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${C.gold}55`,
          borderRadius: 8, padding: "10px 16px", marginBottom: 20,
          color: C.gold, fontSize: 13, display: "flex", gap: 10, alignItems: "center" }}>
          ⚠️ <span>DB chưa có trận WC hôm nay → đang dùng <b>mock data giả</b>. Để có trận thật: Admin → Sync Fixtures từ Zafronix.</span>
        </div>
      )}

      {/* ── Loading / Error ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: C.textDim }}>
          ⏳ Đang tải trận hôm nay...
        </div>
      )}
      {error && (
        <div style={{ background: "rgba(224,85,85,0.1)", border: `1px solid ${C.red}`,
          borderRadius: 8, padding: 16, color: C.red, marginBottom: 16 }}>
          ❌ {error}
          {!currentUser && (
            <span style={{ marginLeft: 8, color: C.textDim, fontSize: 12 }}>
              (Cần đăng nhập để gọi API)
            </span>
          )}
        </div>
      )}

      {/* ── Danh sách trận ── */}
      {!loading && todayMatches && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>
              📅 {todayMatches.length} trận hôm nay
              {todayMatches.length > 0 && (
                <span style={{ color: C.textFaint, fontSize: 12, marginLeft: 8 }}>
                  {fmtDate(todayMatches[0].matchDate)} · giờ VN (UTC+7)
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={loadTodayWc} style={{
                padding: "7px 14px", borderRadius: 6, border: `1px solid ${C.border}`,
                background: "transparent", color: C.textDim, cursor: "pointer", fontSize: 13,
              }}>
                🔄 Làm mới
              </button>
              {!injected ? (
                <button onClick={handleInject} disabled={!todayMatches.length || !currentUser} style={{
                  padding: "7px 18px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: todayMatches.length && currentUser ? C.green : C.bg3,
                  color: todayMatches.length && currentUser ? "#fff" : C.textFaint,
                  fontWeight: 700, fontSize: 13,
                  opacity: !currentUser ? 0.6 : 1,
                }}>
                  ⚡ Inject vào Lịch đấu {!currentUser && "(cần login)"}
                </button>
              ) : (
                <button onClick={handleEject} style={{
                  padding: "7px 18px", borderRadius: 6, border: `1px solid ${C.red}`,
                  background: "transparent", color: C.red, cursor: "pointer",
                  fontWeight: 700, fontSize: 13,
                }}>
                  🗑️ Xoá khỏi Lịch đấu
                </button>
              )}
            </div>
          </div>

          {/* MatchCard đầy đủ — giống PageMatches */}
          {injected ? (
            <>
              <div style={{ marginBottom: 10, fontSize: 12, color: C.green }}>
                ✅ Đang inject — trận xuất hiện ở tab <b>Lịch đấu</b>. Dự đoán & kết quả bên dưới:
              </div>
              <div className="grid-2">
                {liveMatches.map(m => (
                  <MatchCard
                    key={m.id}
                    m={m}
                    showAdmin={currentUser?.role === "admin"}
                    {...matchCardProps}
                  />
                ))}
              </div>
            </>
          ) : (
            // Preview trước khi inject — dùng WcPreviewCard đơn giản
            <div>
              {todayMatches.map(m => (
                <WcPreviewCard key={m.id} m={m} />
              ))}
              {todayMatches.length === 0 && (
                <div style={{ textAlign: "center", padding: 32, color: C.textFaint }}>
                  Không có trận nào hôm nay
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Ghi chú ── */}
      <div style={{ marginTop: 32, padding: "16px 20px", background: C.bg3,
        borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.textFaint }}>
        <b style={{ color: C.textDim }}>💡 Ghi chú:</b>
        <ul style={{ margin: "6px 0 0 16px", lineHeight: 2 }}>
          <li>Trận inject sẽ xuất hiện ở <b>Lịch đấu</b> và <b>Lịch sử dự đoán</b> như trận thật.</li>
          <li>Sau khi test xong, nhấn <b style={{ color: C.red }}>Xoá khỏi Lịch đấu</b> để dọn dẹp.</li>
          <li>Nếu DB có trận thật (status NS/1H/2H), inject để test logic khóa + tính điểm.</li>
          <li>Nếu chỉ thấy mock data → vào Admin → POST <code>/api/wc/sync</code> để kéo Zafronix về DB.</li>
        </ul>
      </div>
    </div>
  );
}

// ── Preview card (trước khi inject) ──────────────────────────────────────────
function WcPreviewCard({ m }) {
  const hg = m.homeGoals ?? null;
  const ag = m.awayGoals ?? null;
  const hasScore = hg !== null && ag !== null;
  const isLive = ["1H","2H","HT","ET"].includes(m.status);
  const isDone = ["FT","AET","PEN"].includes(m.status);

  return (
    <div style={{
      background: C.bg3, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "14px 18px", marginBottom: 10,
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    }}>
      <div style={{ width: 55, textAlign: "center" }}>
        <div style={{ color: C.gold, fontWeight: 700, fontSize: 15 }}>{fmtTime(m.matchDate)}</div>
        <div style={{ fontSize: 10, color: C.textFaint }}>{m.round}</div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
        <span style={{ color: C.text, fontWeight: 600, fontSize: 14, textAlign: "right" }}>
          {m.homeTeam?.name}
        </span>
        <img src={m.homeTeam?.logo} alt="" style={{ width: 28, height: 28, objectFit: "contain" }}
          onError={e => { e.target.style.opacity = 0.3; }} />
      </div>
      <div style={{ textAlign: "center", minWidth: 80 }}>
        {hasScore ? (
          <div style={{ fontSize: 20, fontWeight: 800, color: isLive ? C.green : C.text }}>
            {hg} – {ag}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.textFaint }}>vs</div>
        )}
        <div style={{ marginTop: 3, fontSize: 11 }}>
          <span style={{
            background: isLive ? C.green : isDone ? C.textFaint : C.blue,
            color: "#fff", borderRadius: 4, padding: "1px 6px", fontWeight: 700,
          }}>
            {isLive ? `🔴 ${m.status}` : isDone ? m.status : "Chưa đấu"}
          </span>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
        <img src={m.awayTeam?.logo} alt="" style={{ width: 28, height: 28, objectFit: "contain" }}
          onError={e => { e.target.style.opacity = 0.3; }} />
        <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{m.awayTeam?.name}</span>
      </div>
      {(m.stadium || m.city) && (
        <div style={{ textAlign: "right", fontSize: 11, color: C.textFaint }}>
          {m.stadium && <div>📍 {m.stadium}</div>}
          {m.city && <div>{m.city}</div>}
        </div>
      )}
    </div>
  );
}
