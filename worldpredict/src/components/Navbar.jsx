import { useState } from "react";
import { C } from "../styles/theme";

export default function Navbar({ page, setPage, currentUser, doLogout, setModal }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { id: "home",        label: "🏠 Trang chủ" },
    { id: "matches",     label: "📅 Lịch đấu" },
    { id: "leaderboard", label: "🏆 Xếp hạng" },
    { id: "history",     label: "📜 Lịch sử" },
    ...(currentUser?.role === "admin" ? [{ id: "admin", label: "👑 Admin" }] : []),
  ];

  function handleNav(id) {
    setPage(id);
    setMenuOpen(false);
  }

  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        {/* Logo */}
        <div className="nav-logo">
          WC<span>2026</span>{" "}
          <span style={{ color: C.goldDim, fontSize: 14 }}>PREDICTOR</span>
        </div>

        {/* Desktop nav links */}
        <div className="nav-links nav-links-desktop">
          {navItems.map(n => (
            <button key={n.id} className={`nav-tab ${page === n.id ? "active" : ""}`} onClick={() => handleNav(n.id)}>
              {n.label}
            </button>
          ))}
        </div>

        {/* User info + logout (desktop) */}
        <div className="nav-user nav-user-desktop">
          {currentUser ? (
            <>
              <div style={{ textAlign: "right" }}>
                <div className="nav-user-name">{currentUser.fullName || currentUser.username}</div>
                <div className="nav-user-role" style={{ color: currentUser.role === "admin" ? C.goldDim : (currentUser.points || 0) >= 0 ? C.green : C.red }}>
                  {currentUser.role === "admin" ? "ADMIN" : `${(currentUser.points || 0) >= 0 ? "+" : ""}${currentUser.points || 0} điểm`}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setPage("change-password"); setMenuOpen(false); }} style={{ marginRight: 4 }}>🔑</button>
              <button className="btn btn-ghost btn-sm" onClick={doLogout}>Đăng xuất</button>
            </>
          ) : (
            <button className="btn btn-gold btn-sm" onClick={() => setModal({ type: "login" })}>🔐 Đăng nhập</button>
          )}
        </div>

        {/* Mobile: user points + hamburger */}
        <div className="nav-mobile-right">
          {currentUser && (
            <div style={{ fontSize: 12, fontFamily: "Oswald", fontWeight: 700, color: currentUser.role === "admin" ? C.gold : (currentUser.points || 0) >= 0 ? C.green : C.red }}>
              {currentUser.role === "admin" ? "ADMIN" : `${(currentUser.points || 0) >= 0 ? "+" : ""}${currentUser.points || 0}đ`}
            </div>
          )}
          <button
            className="btn btn-ghost btn-sm nav-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="nav-mobile-menu">
          {navItems.map(n => (
            <button key={n.id} className={`nav-mobile-item ${page === n.id ? "active" : ""}`} onClick={() => handleNav(n.id)}>
              {n.label}
            </button>
          ))}
          <div className="nav-mobile-divider" />
          {currentUser ? (
            <>
              <div style={{ padding: "8px 16px", fontSize: 12, color: C.textFaint }}>
                {currentUser.fullName || currentUser.username}
              </div>
              <button className="nav-mobile-item" onClick={() => { setPage("change-password"); setMenuOpen(false); }}>🔑 Đổi mật khẩu</button>
              <button className="nav-mobile-item" onClick={() => { doLogout(); setMenuOpen(false); }}>🚪 Đăng xuất</button>
            </>
          ) : (
            <button className="nav-mobile-item" onClick={() => { setModal({ type: "login" }); setMenuOpen(false); }}>🔐 Đăng nhập</button>
          )}
        </div>
      )}
    </nav>
  );
}
