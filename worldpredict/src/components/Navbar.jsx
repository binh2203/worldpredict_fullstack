import { C } from "../styles/theme";

export default function Navbar({ page, setPage, currentUser, doLogout, setModal }) {
  const navItems = [
    { id: "home",        label: "🏠 Trang chủ" },
    { id: "matches",     label: "📅 Lịch đấu" },
    { id: "leaderboard", label: "🏆 Xếp hạng" },
    { id: "history",     label: "📜 Lịch sử" },
    { id: "test",        label: "🧪 Test" },
    ...(currentUser?.role === "admin" ? [{ id: "admin", label: "👑 Admin" }] : []),
  ];

  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <div className="nav-logo">
          World <span>Predict</span>{" "}
          <span style={{ color: C.goldDim, fontSize: 14 }}>2026</span>
        </div>

        <div className="nav-links">
          {navItems.map(n => (
            <button
              key={n.id}
              className={`nav-tab ${page === n.id ? "active" : ""}`}
              onClick={() => setPage(n.id)}
            >
              {n.label}
            </button>
          ))}
        </div>

        <div className="nav-user">
          {currentUser ? (
            <>
              <div style={{ textAlign: "right" }}>
                <div className="nav-user-name">{currentUser.fullName || currentUser.username}</div>
                <div
                  className="nav-user-role"
                  style={{
                    color: currentUser.role === "admin"
                      ? C.goldDim
                      : (currentUser.points || 0) >= 0 ? C.green : C.red,
                  }}
                >
                  {currentUser.role === "admin"
                    ? "ADMIN"
                    : `${(currentUser.points || 0) >= 0 ? "+" : ""}${(currentUser.points || 0) + " điểm"}`}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage("change-password")} style={{ marginRight: 4 }}>🔑 Đổi mật khẩu</button>
              <button className="btn btn-ghost btn-sm" onClick={doLogout}>Đăng xuất</button>
            </>
          ) : (
            <button className="btn btn-gold btn-sm" onClick={() => setModal({ type: "login" })}>
              🔐 Đăng nhập
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}