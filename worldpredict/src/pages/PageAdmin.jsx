import { useState } from "react";
import { ROUNDS, DEFAULT_BET_RULES, API_URL } from "../constants";
import { C } from "../styles/theme";
import MatchCard from "../components/MatchCard";
import api from "../services/api";

// ─── PAGE ADMIN ───────────────────────────────────────────────────────────────

export default function PageAdmin({
  currentUser, backendMode,
  matches, predResults, users, setUsers,
  betRules, setBetRules,
  filteredMatches, roundFilter, setRoundFilter,
  leaderboard, predictions,
  showToast, doCreateUser, setModal,
  getUserPred, doPredict,
}) {
  const [adminTab, setAdminTab] = useState("matches");
  const [testActive, setTestActive] = useState(false);
  const [newUser,  setNewUser]  = useState({ username: "", password: "", fullName: "", phone: "" });
  const [editRule, setEditRule] = useState(null);

  if (currentUser?.role !== "admin") return (
    <div className="wrap section" style={{ textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 48 }}>🚫</div>
      <div style={{ color: C.textDim, marginTop: 16 }}>Chỉ Admin mới được truy cập</div>
    </div>
  );

  const adminNavItems = [
    { id: "matches",   icon: "📅", label: "Trận đấu" },
    { id: "betrules",  icon: "🏅", label: "Điểm cược" },
    { id: "users",     icon: "👥", label: "Người dùng" },
    { id: "dashboard", icon: "📊", label: "Dashboard" },
  ];

  async function saveBetRule() {
    if (!editRule) return;
    const data = {
      winPoints:         parseInt(editRule.winPoints)         || 0,
      losePoints:        parseInt(editRule.losePoints)        || 0,
      defaultLosePoints: parseInt(editRule.defaultLosePoints) || 0,
    };
    setBetRules(p => ({ ...p, [editRule.round]: data }));
    try {
      await api.saveBetRule(editRule.round, data);
    } catch (e) { /* mock mode: ignore */ }
    showToast(`Đã lưu quy tắc điểm vòng ${editRule.round}`, "success");
    setEditRule(null);
  }

  const matchCardProps = { currentUser, betRules, predResults, getUserPred, doPredict, setModal };

  return (
    <div className="wrap section">
      <div className="section-head" style={{ marginBottom: 24 }}>
        <div className="section-title">👑 <span>Admin Panel</span></div>
        <div style={{ fontSize: 12, color: backendMode ? C.green : C.orange, border: `1px solid ${backendMode ? C.green : C.orange}`, padding: "4px 10px", borderRadius: 20, fontFamily: "Barlow Condensed" }}>
          {backendMode ? "🟢 SQL Server" : "🟡 Mock Mode"}
        </div>
      </div>

      <div className="admin-grid">
        {/* Sidebar */}
        <div className="admin-sidebar">
          {adminNavItems.map(n => (
            <div key={n.id} className={`admin-nav-item ${adminTab === n.id ? "active" : ""}`} onClick={() => setAdminTab(n.id)}>
              <span>{n.icon}</span> {n.label}
            </div>
          ))}
        </div>

        <div>
          {/* ── Tab: Trận đấu ─────────────────────────────────────────────── */}
          {adminTab === "matches" && (
            <div>
              <div style={{ marginBottom: 18 }}>
                <div className="round-chips">
                  {["all", ...ROUNDS].map(r => (
                    <button key={r} className={`round-chip ${roundFilter === r ? "active" : ""}`} onClick={() => setRoundFilter(r)}>
                      {r === "all" ? "Tất cả" : r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sealed-warning" style={{ marginBottom: 14, fontSize: 13 }}>
                🔐 Kết quả sau khi nhập sẽ bị niêm phong — không ai (kể cả admin) có thể sửa lại
              </div>
              <div className="grid-2">
                {filteredMatches.map(m => <MatchCard key={m.id} m={m} showAdmin {...matchCardProps} />)}
              </div>
            </div>
          )}

          {/* ── Tab: Tiền cược ────────────────────────────────────────────── */}
          {adminTab === "betrules" && (
            <div>
              <div className="lock-warning" style={{ marginBottom: 20 }}>
                💡 Thiết lập số điểm thắng/thua/không dự đoán cho từng vòng. Admin tự quyết định.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {ROUNDS.map(r => {
                  const rule      = betRules[r] || DEFAULT_BET_RULES[r];
                  const isEditing = editRule?.round === r;
                  return (
                    <div key={r} className="card" style={{ padding: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isEditing ? 16 : 0 }}>
                        <div>
                          <div style={{ fontFamily: "Barlow Condensed", fontSize: 14, fontWeight: 700, color: C.gold, letterSpacing: 1 }}>{r}</div>
                          {!isEditing && (
                            <div style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>
                              Thắng: <span style={{ color: C.green }}>+{rule.winPoints} điểm</span> ·{" "}
                              Thua: <span style={{ color: C.red }}>-{rule.losePoints} điểm</span> ·{" "}
                              Không cá: <span style={{ color: C.orange }}>-{rule.defaultLosePoints} điểm</span>
                            </div>
                          )}
                        </div>
                        {!isEditing
                          ? <button className="btn btn-outline btn-sm" onClick={() => setEditRule({ round: r, ...rule })}>✏️ Sửa</button>
                          : <button className="btn btn-ghost btn-sm"   onClick={() => setEditRule(null)}>Huỷ</button>}
                      </div>
                      {isEditing && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          {[
                            { k: "winPoints",         l: "Thắng (+điểm)",          c: C.green  },
                            { k: "losePoints",        l: "Thua bị trừ (-điểm)",    c: C.red    },
                            { k: "defaultLosePoints", l: "Không cá bị trừ (-điểm)",c: C.orange },
                          ].map(f => (
                            <div key={f.k} className="form-field">
                              <label className="form-label" style={{ color: f.c }}>{f.l}</label>
                              <input type="number" className="form-input" value={editRule[f.k]}
                                onChange={e => setEditRule(p => ({ ...p, [f.k]: e.target.value }))} />
                            </div>
                          ))}
                          <div style={{ gridColumn: "1/-1" }}>
                            <button className="btn btn-gold" style={{ width: "100%" }} onClick={saveBetRule}>✅ Lưu quy tắc điểm</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Tab: Người dùng ───────────────────────────────────────────── */}
          {adminTab === "users" && (
            <div>
              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 14, color: C.gold, marginBottom: 16, letterSpacing: 1 }}>➕ TẠO TÀI KHOẢN MỚI</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { k: "username", l: "Tên đăng nhập", t: "text" },
                    { k: "password", l: "Mật khẩu",      t: "password" },
                    { k: "fullName", l: "Họ tên",        t: "text" },
                    { k: "phone",    l: "Điện thoại",    t: "text" },
                  ].map(f => (
                    <div key={f.k} className="form-field">
                      <label className="form-label">{f.l}</label>
                      <input className="form-input" type={f.t} value={newUser[f.k]}
                        onChange={e => setNewUser(p => ({ ...p, [f.k]: e.target.value }))} />
                    </div>
                  ))}
                  <div style={{ gridColumn: "1/-1" }}>
                    <button className="btn btn-gold" onClick={() => {
                      if (doCreateUser(newUser.username, newUser.password, newUser.fullName, newUser.phone))
                        setNewUser({ username: "", password: "", fullName: "", phone: "" });
                    }}>
                      ✅ Tạo tài khoản
                    </button>
                  </div>
                </div>
              </div>

              <div className="card">
                <table className="data-table">
                  <thead>
                    <tr><th>Người dùng</th><th>Vai trò</th><th>Số dư</th><th>Đúng</th><th>Sai</th><th>Không cá</th><th>Trạng thái</th></tr>
                  </thead>
                  <tbody>
                    {leaderboard.concat(users.filter(u => u.role === "admin")).map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{u.fullName || u.username}</div>
                          <div style={{ fontSize: 11, color: C.textFaint }}>@{u.username}</div>
                        </td>
                        <td><span className={`badge ${u.role === "admin" ? "badge-admin" : "badge-upcoming"}`}>{u.role}</span></td>
                        <td><span className={(u.points || 0) >= 0 ? "money-positive" : "money-negative"}>
                          {(u.points || 0) >= 0 ? "+" : ""}{u.points || 0} điểm
                        </span></td>
                        <td><span style={{ color: C.green }}>{u.correct || 0}</span></td>
                        <td><span style={{ color: C.red   }}>{u.wrong   || 0}</span></td>
                        <td><span style={{ color: C.orange}}>{u.noPred  || 0}</span></td>
                        <td>
                          {u.id !== currentUser.id && u.role !== "admin" && (
                            <button className="btn btn-ghost btn-xs"
                              onClick={() => {
                                setUsers(p => p.map(uu => uu.id === u.id ? { ...uu, isActive: !uu.isActive } : uu));
                                showToast(`${u.isActive ? "Đã vô hiệu hoá" : "Đã kích hoạt"} ${u.username}`);
                              }}>
                              {u.isActive ? "🚫 Khoá" : "✅ Mở"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab: Dashboard ────────────────────────────────────────────── */}
          {adminTab === "dashboard" && (
            <div>
              <div className="grid-4" style={{ marginBottom: 20 }}>
                {[
                  { n: matches.length,                              l: "Tổng trận",     i: "🏟️" },
                  { n: matches.filter(m => m.resultLocked).length, l: "Đã niêm phong", i: "🔐" },
                  { n: matches.filter(m => m.isLocked && !m.resultLocked).length, l: "Đã khóa DĐ", i: "🔒" },
                  { n: predResults.length,                         l: "Giao dịch",     i: "💰" },
                ].map((s, i) => (
                  <div key={i} className="card stat-box">
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{s.i}</div>
                    <div className="stat-num">{s.n}</div>
                    <div className="stat-label">{s.l}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 13, color: C.gold, marginBottom: 12, letterSpacing: 1 }}>🔌 KẾT NỐI SQL SERVER</div>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: C.green, background: "rgba(0,0,0,0.3)", padding: "12px 16px", borderRadius: 8, marginBottom: 12, wordBreak: "break-all" }}>
                  Server=ADMIN-PC;Database=PredictWC2026;Trusted_Connection=True;TrustServerCertificate=True
                </div>
                <div style={{ fontSize: 12, color: C.textDim }}>
                  Backend API: <span style={{ color: C.gold }}>{API_URL}</span> — Đặt USE_MOCK = false và đảm bảo backend đang chạy để kết nối thật.
                </div>
              </div>

              <div className="card card-red" style={{ padding: 20 }}>
                <div style={{ fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 13, color: C.red, marginBottom: 12, letterSpacing: 1 }}>🛡️ CHÍNH SÁCH MINH BẠCH</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: C.textDim }}>
                  <div>🔒 Tự động khóa dự đoán <b style={{ color: C.text }}>30 phút trước</b> giờ trận</div>
                  <div>🔐 Kết quả sau khi nhập sẽ <b style={{ color: C.text }}>bị niêm phong vĩnh viễn</b></div>
                  <div>🏅 Người không dự đoán <b style={{ color: C.text }}>mặc định bị trừ điểm</b> theo quy tắc vòng đấu</div>
                  <div>📊 Mọi giao dịch được ghi lại trong <b style={{ color: C.text }}>PredictionResults</b></div>
                  <div>🗄️ SQL Stored Procedure <b style={{ color: C.text }}>sp_SetMatchResult</b> có guard không cho sửa sau khi khóa</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Test Mode ────────────────────────────────────────────── */}
          {adminTab === "testmode" && (
            <div>
              <div className="card" style={{ padding: 20, marginBottom: 20, border: `1px solid ${C.gold}` }}>
                <div style={{ fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 14, color: C.gold, marginBottom: 8, letterSpacing: 2 }}>
                  🧪 TEST MODE — Full flow API-Football (Zafronix)
                </div>
                <div style={{ fontSize: 13, color: C.textDim, marginBottom: 16, lineHeight: 1.8 }}>
                  Inject 4 trận giả vào <b style={{color:C.text}}>Lịch đấu thật</b> để test toàn bộ luồng:<br/>
                  <span style={{color:C.gold}}>NS (mở DĐ)</span> · <span style={{color:"#f97316"}}>1H (đã khóa)</span> · <span style={{color:C.green}}>FT (có kết quả → tính điểm)</span>
                </div>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  <button className="btn btn-gold" onClick={() => { doLoadTestScenario(); setTestActive(true); }}>
                    🧪 Inject trận test vào Lịch đấu
                  </button>
                  {testActive && (
                    <button className="btn btn-danger" onClick={() => { doClearTestScenario(); setTestActive(false); }}>
                      🗑 Xóa trận test
                    </button>
                  )}
                </div>
                {testActive && (
                  <div style={{ marginTop:12, padding:"10px 14px", background:"rgba(234,179,8,0.1)", borderRadius:8, fontSize:13, color:C.gold }}>
                    ✅ Trận test đã inject — vào <b>📅 Lịch đấu</b> để thấy và dự đoán
                  </div>
                )}
              </div>

              <div className="card card-gold" style={{ padding: 18 }}>
                <div style={{ fontFamily:"Barlow Condensed", fontWeight:700, fontSize:13, color:C.gold, marginBottom:10, letterSpacing:1 }}>
                  📋 HƯỚNG DẪN TEST 6 BƯỚC
                </div>
                <ol style={{ margin:0, paddingLeft:20, fontSize:13, color:C.textDim, lineHeight:2.1 }}>
                  <li>Bấm <b style={{color:C.text}}>"Inject trận test"</b> ở trên</li>
                  <li>Đăng nhập bằng tài khoản user (tạo ở tab 👥 Người dùng nếu chưa có)</li>
                  <li>Vào <b style={{color:C.text}}>📅 Lịch đấu</b> → thấy trận <b>8001 Brazil vs Argentina (NS)</b> → dự đoán tỉ số</li>
                  <li>Trận <b>8002 France vs Germany (1H)</b> → dự đoán đã bị khóa ✓</li>
                  <li>Quay lại Admin → tab <b style={{color:C.text}}>📅 Trận đấu</b> → nhập kết quả cho trận <b>8003 / 8004</b></li>
                  <li>Điểm tự tính → kiểm tra <b style={{color:C.text}}>🏆 Xếp hạng</b> và <b style={{color:C.text}}>📜 Lịch sử</b></li>
                </ol>
                <div style={{ marginTop:14, padding:"10px 14px", background:"rgba(0,0,0,0.2)", borderRadius:8, fontSize:12, color:C.textFaint }}>
                  <b style={{color:C.text}}>Trận 8003</b> Spain 2–1 England · Kèo -0.5 → Spain thắng thực tế (2-0.5=1.5 &gt; 1) → dự đoán "Nhà thắng" = ĐÚ́NG<br/>
                  <b style={{color:C.text}}>Trận 8004</b> Portugal 1–1 USA · Không kèo → Hòa → dự đoán "Hòa" = ĐÚ́NG
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}