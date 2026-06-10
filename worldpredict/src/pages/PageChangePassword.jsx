import { useState } from "react";
import { C } from "../styles/theme";

export default function PageChangePassword({ currentUser, doChangePassword, setPage }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  if (!currentUser) {
    return (
      <div className="wrap" style={{ paddingTop: 80, textAlign: "center", color: C.textFaint }}>
        Vui lòng đăng nhập để đổi mật khẩu.
      </div>
    );
  }

  function validate() {
    const e = {};
    if (!form.current)         e.current  = "Vui lòng nhập mật khẩu hiện tại";
    if (!form.next)            e.next     = "Vui lòng nhập mật khẩu mới";
    else if (form.next.length < 6) e.next = "Mật khẩu mới phải có ít nhất 6 ký tự";
    if (!form.confirm)         e.confirm  = "Vui lòng xác nhận mật khẩu mới";
    else if (form.next !== form.confirm) e.confirm = "Mật khẩu xác nhận không khớp";
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    const ok = await doChangePassword(form.current, form.next);
    setLoading(false);
    if (ok) setForm({ current: "", next: "", confirm: "" });
  }

  const inputStyle = (hasErr) => ({
    width: "100%",
    padding: "10px 14px",
    background: C.bg3,
    border: `1px solid ${hasErr ? C.red : C.border}`,
    borderRadius: 8,
    color: C.text,
    caretColor: C.text,
    WebkitTextFillColor: C.text,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    WebkitBoxShadow: `0 0 0px 1000px ${C.bg3} inset`,
  });

  return (
    <div className="wrap" style={{ paddingTop: 60, paddingBottom: 60, maxWidth: 480, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <button
          onClick={() => setPage("home")}
          style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 16 }}
        >
          ← Quay lại
        </button>
        <h2 style={{ margin: 0, color: C.text, fontFamily: "Barlow Condensed", fontSize: 28, letterSpacing: 1 }}>
          🔑 Đổi mật khẩu
        </h2>
        <p style={{ margin: "6px 0 0", color: C.textFaint, fontSize: 13 }}>
          {currentUser.fullName || currentUser.username} · {currentUser.role === "admin" ? "ADMIN" : "Người dùng"}
        </p>
      </div>

      {/* Form card */}
      <div style={{
        background: C.bg2,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "28px 28px",
      }}>
        {/* Mật khẩu hiện tại */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", color: C.textFaint, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            Mật khẩu hiện tại
          </label>
          <input
            type="password"
            placeholder="Nhập mật khẩu hiện tại"
            value={form.current}
            onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
            style={inputStyle(!!errors.current)}
          />
          {errors.current && <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{errors.current}</div>}
        </div>

        {/* Mật khẩu mới */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", color: C.textFaint, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            Mật khẩu mới
          </label>
          <input
            type="password"
            placeholder="Ít nhất 6 ký tự"
            value={form.next}
            onChange={e => setForm(f => ({ ...f, next: e.target.value }))}
            style={inputStyle(!!errors.next)}
          />
          {errors.next && <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{errors.next}</div>}
        </div>

        {/* Xác nhận mật khẩu mới */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", color: C.textFaint, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            Xác nhận mật khẩu mới
          </label>
          <input
            type="password"
            placeholder="Nhập lại mật khẩu mới"
            value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={inputStyle(!!errors.confirm)}
          />
          {errors.confirm && <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{errors.confirm}</div>}
        </div>

        <button
          className="btn btn-gold"
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: "100%", padding: "12px", fontSize: 15, letterSpacing: 1, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Đang xử lý..." : "💾 Xác nhận đổi mật khẩu"}
        </button>
      </div>

      {/* Gợi ý */}
      <div style={{ marginTop: 16, padding: "12px 16px", background: C.bg3, borderRadius: 8, border: `1px solid ${C.border}` }}>
        <div style={{ color: C.textFaint, fontSize: 12 }}>
          💡 <strong style={{ color: C.text }}>Lưu ý:</strong> Mật khẩu mới phải có ít nhất 6 ký tự.
          Sau khi đổi thành công, hãy ghi nhớ mật khẩu mới của bạn.
        </div>
      </div>
    </div>
  );
}
