// ─── TOAST ────────────────────────────────────────────────────────────────────

export function Toast({ toast }) {
  if (!toast) return null;
  const icon = toast.type === "success" ? "✓" : toast.type === "error" ? "✗" : toast.type === "warn" ? "⚠" : "";
  return (
    <div className={`toast toast-${toast.type}`}>
      {icon} {toast.msg}
    </div>
  );
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────

const COLORS = ["#C9A84C", "#E8C96A", "#4CAF7A", "#4A9BE8", "#E05555"];

export function Confetti({ active }) {
  if (!active) return null;
  const items = Array.from({ length: 25 }, (_, i) => ({
    id:    i,
    x:     Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 2,
    size:  5 + Math.random() * 8,
  }));

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      {items.map(c => (
        <div
          key={c.id}
          style={{
            position: "absolute",
            left: `${c.x}%`,
            top: -20,
            width: c.size,
            height: c.size,
            background: c.color,
            borderRadius: 2,
            animation: `confettiFall 3s ${c.delay}s linear forwards`,
          }}
        />
      ))}
    </div>
  );
}
