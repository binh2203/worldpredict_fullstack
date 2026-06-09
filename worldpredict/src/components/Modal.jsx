import { useState } from "react";
import { C } from "../styles/theme";
import { getMatchResult, fmtDateTime } from "../utils/helpers";

// ─── MODAL ────────────────────────────────────────────────────────────────────

export default function Modal({ modal, setModal, doLogin, doSetResult, doSetHandicap }) {
  const [f, setF] = useState({
    name: "", password: "",
    homeGoals: "", awayGoals: "", handicap: "",
  });

  if (!modal) return null;
  const close = () => setModal(null);

  // ── Login only (đăng ký bị tắt — tài khoản do Admin cấp) ──────────────
  if (modal.type === "login") {
    return (
      <div className="modal-bg" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal-box">
          <div className="modal-title">🔐 Đăng nhập</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-field">
              <label className="form-label">Tên đăng nhập</label>
              <input
                className="form-input"
                value={f.name}
                autoFocus
                onChange={e => setF(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Mật khẩu</label>
              <input
                className="form-input"
                type="password"
                value={f.password}
                onChange={e => setF(p => ({ ...p, password: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && doLogin(f.name, f.password)}
              />
            </div>
            <button
              className="btn btn-gold"
              onClick={() => doLogin(f.name, f.password)}
            >
              🔐 Đăng nhập
            </button>
            <div style={{ textAlign: "center", fontSize: 12, color: C.textFaint, marginTop: 4 }}>
              Chưa có tài khoản? Liên hệ quản trị viên để được cấp.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Set Result ──────────────────────────────────────────────────────────
  if (modal.type === "result") {
    const m = modal.data.m;
    if (m.resultLocked) return (
      <div className="modal-bg" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal-box">
          <div className="modal-title" style={{ color: C.red }}>🔐 Đã niêm phong</div>
          <div className="sealed-warning" style={{ marginBottom: 20 }}>
            Kết quả {m.homeGoals} — {m.awayGoals} đã được niêm phong lúc {fmtDateTime(m.resultSetAt)}. Không thể thay đổi.
          </div>
          <button className="btn btn-ghost" onClick={close}>Đóng</button>
        </div>
      </div>
    );

    return (
      <div className="modal-bg" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal-box">
          <div className="modal-title">Nhập kết quả</div>
          <div className="sealed-warning" style={{ marginBottom: 20 }}>
            ⚠️ Sau khi lưu, kết quả sẽ bị niêm phong vĩnh viễn và không thể sửa!
          </div>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: C.text, marginBottom: 4 }}>
              {m.homeTeam?.name} vs {m.awayTeam?.name}
            </div>
            {m.handicap && (
              <div className="hcap-box" style={{ marginTop: 8 }}>
                Kèo chấp: {m.handicap > 0 ? `+${m.handicap}` : m.handicap}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <div className="form-field" style={{ width: 90 }}>
              <label className="form-label" style={{ textAlign: "center" }}>{m.homeTeam?.name?.split(" ")[0]}</label>
              <input type="number" min="0" max="30" className="form-input"
                style={{ textAlign: "center", fontSize: 28, fontFamily: "Oswald", color: C.gold }}
                placeholder="0" value={f.homeGoals}
                onChange={e => setF(p => ({ ...p, homeGoals: e.target.value }))} />
            </div>
            <span style={{ color: C.textFaint, fontSize: 28, fontFamily: "Oswald", marginTop: 14 }}>—</span>
            <div className="form-field" style={{ width: 90 }}>
              <label className="form-label" style={{ textAlign: "center" }}>{m.awayTeam?.name?.split(" ")[0]}</label>
              <input type="number" min="0" max="30" className="form-input"
                style={{ textAlign: "center", fontSize: 28, fontFamily: "Oswald", color: C.gold }}
                placeholder="0" value={f.awayGoals}
                onChange={e => setF(p => ({ ...p, awayGoals: e.target.value }))} />
            </div>
          </div>
          {f.homeGoals !== "" && f.awayGoals !== "" && (
            <div className="hcap-box" style={{ marginBottom: 16 }}>
              Kết quả: {(() => {
                const r = getMatchResult(parseInt(f.homeGoals), parseInt(f.awayGoals), m.handicap);
                return r === "home" ? "🏠 Nhà thắng" : r === "away" ? "✈️ Khách thắng" : "🤝 Hòa";
              })()}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-gold" style={{ flex: 1 }}
              onClick={() => doSetResult(m.id, f.homeGoals, f.awayGoals)}>
              🔐 Lưu & Niêm phong
            </button>
            <button className="btn btn-ghost" onClick={close}>Huỷ</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Set Handicap ────────────────────────────────────────────────────────
  if (modal.type === "handicap") {
    const m = modal.data.m;
    return (
      <div className="modal-bg" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal-box">
          <div className="modal-title">Thiết lập kèo chấp</div>
          <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 16, color: C.text }}>
            {m.homeTeam?.name} vs {m.awayTeam?.name}
          </div>
          <div className="hcap-box" style={{ marginBottom: 16, fontSize: 13 }}>
            Số dương = nhà chấp (VD: +1.5 → nhà chấp 1.5 trái). Số âm = khách chấp. Để trống = không có kèo.
          </div>
          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="form-label">Kèo chấp</label>
            <input type="number" step="0.25" className="form-input" value={f.handicap}
              placeholder={`Hiện tại: ${m.handicap ?? "Không có"}`}
              onChange={e => setF(p => ({ ...p, handicap: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-gold" style={{ flex: 1 }}
              onClick={() => doSetHandicap(m.id, f.handicap === "" ? null : f.handicap)}>
              ✅ Lưu kèo
            </button>
            {m.handicap !== null && m.handicap !== undefined && (
              <button className="btn btn-danger" onClick={() => doSetHandicap(m.id, null)}>🗑 Bỏ kèo</button>
            )}
            <button className="btn btn-ghost" onClick={close}>Huỷ</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
