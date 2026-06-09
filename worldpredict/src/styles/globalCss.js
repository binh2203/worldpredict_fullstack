import { C } from "./theme";

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
// Inject via <style>{globalCss}</style> ở App root
const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.bg}; color: ${C.text}; font-family: 'Barlow', sans-serif; min-height: 100vh; }
  input, select, button, textarea { font-family: inherit; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: ${C.bg2}; }
  ::-webkit-scrollbar-thumb { background: ${C.goldBorder}; border-radius: 3px; }

  .app-bg { position: fixed; inset: 0; z-index: 0;
    background: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,0.07) 0%, transparent 60%),
                linear-gradient(180deg, ${C.bg} 0%, #060810 100%);
    pointer-events: none; }

  .wrap { position: relative; z-index: 1; max-width: 1240px; margin: 0 auto; padding: 0 20px; }

  /* ── NAV ── */
  .nav { position: sticky; top: 0; z-index: 200; background: rgba(7,8,15,0.96);
    border-bottom: 1px solid ${C.goldBorder}; backdrop-filter: blur(24px); }
  .nav-inner { display: flex; align-items: center; gap: 0; height: 60px; }
  .nav-logo { font-family: 'Oswald'; font-size: 20px; font-weight: 700; letter-spacing: 3px; color: ${C.gold};
    text-transform: uppercase; margin-right: 32px; white-space: nowrap; }
  .nav-logo span { color: ${C.text}; font-weight: 300; }
  .nav-links { display: flex; gap: 2px; flex: 1; overflow-x: auto; }
  .nav-links::-webkit-scrollbar { display: none; }
  .nav-tab { background: none; border: none; padding: 0 14px; height: 60px; cursor: pointer;
    font-family: 'Barlow Condensed'; font-weight: 600; font-size: 13px; letter-spacing: 1.5px;
    text-transform: uppercase; color: ${C.textDim}; border-bottom: 2px solid transparent; transition: all 0.2s; white-space: nowrap; }
  .nav-tab:hover { color: ${C.text}; }
  .nav-tab.active { color: ${C.gold}; border-bottom-color: ${C.gold}; }
  .nav-user { display: flex; align-items: center; gap: 12px; margin-left: auto; padding-left: 20px; white-space: nowrap; }
  .nav-user-name { font-size: 13px; font-weight: 600; color: ${C.gold}; }
  .nav-user-role { font-size: 10px; color: ${C.textFaint}; letter-spacing: 1px; text-transform: uppercase; }

  /* ── BUTTONS ── */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: none;
    border-radius: 6px; cursor: pointer; font-family: 'Barlow Condensed'; font-weight: 600;
    letter-spacing: 1px; text-transform: uppercase; transition: all 0.2s; white-space: nowrap; }
  .btn-gold { background: linear-gradient(135deg, ${C.gold} 0%, #A8882C 100%); color: #07080F; font-size: 13px; padding: 9px 20px; }
  .btn-gold:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .btn-outline { background: transparent; border: 1px solid ${C.goldBorder}; color: ${C.gold}; font-size: 12px; padding: 7px 16px; }
  .btn-outline:hover { background: ${C.goldFaint}; border-color: ${C.gold}; }
  .btn-ghost { background: rgba(255,255,255,0.05); border: 1px solid ${C.border}; color: ${C.textDim}; font-size: 12px; padding: 7px 14px; }
  .btn-ghost:hover { background: rgba(255,255,255,0.1); color: ${C.text}; }
  .btn-danger { background: rgba(224,85,85,0.15); border: 1px solid rgba(224,85,85,0.4); color: ${C.red}; font-size: 12px; padding: 7px 14px; }
  .btn-green { background: rgba(76,175,122,0.15); border: 1px solid rgba(76,175,122,0.4); color: ${C.green}; font-size: 12px; padding: 7px 14px; }
  .btn-sm { padding: 5px 12px; font-size: 11px; }
  .btn-xs { padding: 4px 10px; font-size: 10px; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; filter: none !important; }

  /* ── CARDS ── */
  .card { background: ${C.bg2}; border: 1px solid ${C.border}; border-radius: 12px; }
  .card-gold { border-color: ${C.goldBorder}; }
  .card-red  { border-color: rgba(224,85,85,0.4); }

  /* ── FORM ── */
  .form-field { display: flex; flex-direction: column; gap: 6px; }
  .form-label { font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 600; letter-spacing: 1.5px;
    text-transform: uppercase; color: ${C.goldDim}; }
  .form-input { background: rgba(255,255,255,0.06); border: 1px solid ${C.border}; border-radius: 7px;
    padding: 10px 13px; color: ${C.text}; font-size: 14px; outline: none; transition: border 0.2s; width: 100%; }
  .form-input:focus { border-color: ${C.goldBorder}; }
  .form-input::placeholder { color: ${C.textFaint}; }
  .form-select { background: ${C.bg3}; border: 1px solid ${C.border}; border-radius: 7px; padding: 10px 13px;
    color: ${C.text}; font-size: 14px; outline: none; cursor: pointer; width: 100%; }

  /* ── BADGES ── */
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px;
    font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
  .badge-live     { background: rgba(224,85,85,0.15);  border: 1px solid rgba(224,85,85,0.4);    color: #E88; }
  .badge-done     { background: rgba(76,175,122,0.12); border: 1px solid rgba(76,175,122,0.35);  color: ${C.green}; }
  .badge-upcoming { background: rgba(74,155,232,0.1);  border: 1px solid rgba(74,155,232,0.3);   color: ${C.blue}; }
  .badge-locked   { background: rgba(255,165,0,0.1);   border: 1px solid rgba(255,165,0,0.35);   color: ${C.orange}; }
  .badge-sealed   { background: rgba(224,85,85,0.12);  border: 1px solid rgba(224,85,85,0.4);    color: ${C.red}; }
  .badge-hcap     { background: rgba(139,111,212,0.15);border: 1px solid rgba(139,111,212,0.4);  color: ${C.purple}; }
  .badge-correct  { background: rgba(76,175,122,0.15); border: 1px solid rgba(76,175,122,0.4);   color: ${C.green}; }
  .badge-wrong    { background: rgba(224,85,85,0.12);  border: 1px solid rgba(224,85,85,0.35);   color: ${C.red}; }
  .badge-pending  { background: rgba(201,168,76,0.1);  border: 1px solid rgba(201,168,76,0.3);   color: ${C.goldLight}; }
  .badge-admin    { background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.4);   color: ${C.gold}; }
  .badge-money-win  { background: rgba(76,175,122,0.15); border: 1px solid rgba(76,175,122,0.4); color: ${C.green}; font-size: 12px; padding: 4px 10px; }
  .badge-money-lose { background: rgba(224,85,85,0.12);  border: 1px solid rgba(224,85,85,0.35); color: ${C.red};   font-size: 12px; padding: 4px 10px; }
  .badge-no-pred    { background: rgba(232,148,58,0.1);  border: 1px solid rgba(232,148,58,0.35);color: ${C.orange};font-size: 12px; padding: 4px 10px; }

  /* ── MATCH CARD ── */
  .match-card { padding: 18px; position: relative; overflow: hidden; transition: border-color 0.2s; }
  .match-card:hover { border-color: ${C.goldBorder}; }
  .match-card-live-bar   { position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, ${C.red}, ${C.gold}, ${C.red}); background-size: 200% 100%; animation: barSlide 2s linear infinite; }
  .match-card-locked-bar { position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, ${C.orange}, #B8640A, ${C.orange}); background-size: 200% 100%; animation: barSlide 3s linear infinite; }
  @keyframes barSlide { 0% { background-position: 0% 0; } 100% { background-position: 200% 0; } }
  .team-section { display: flex; align-items: center; gap: 10px; }
  .team-logo  { width: 36px; height: 36px; object-fit: contain; flex-shrink: 0; }
  .team-name  { font-family: 'Barlow Condensed'; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; }
  .score-big  { font-family: 'Oswald'; font-size: 32px; font-weight: 700; color: ${C.gold}; letter-spacing: 2px; }
  .vs-text    { font-family: 'Oswald'; font-size: 18px; color: ${C.textFaint}; }
  .pred-opts  { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 10px; }
  .pred-opt   { padding: 10px 4px; border-radius: 7px; border: 1px solid ${C.border}; background: rgba(255,255,255,0.04);
    color: ${C.textDim}; font-family: 'Barlow Condensed'; font-weight: 600; font-size: 12px; letter-spacing: 0.5px;
    cursor: pointer; transition: all 0.18s; text-align: center; }
  .pred-opt:hover:not(:disabled) { border-color: ${C.goldBorder}; color: ${C.gold}; background: ${C.goldFaint}; }
  .pred-opt.selected  { border-color: ${C.gold}; color: ${C.gold}; background: ${C.goldFaint}; }
  .pred-opt:disabled  { opacity: 0.4; cursor: not-allowed; }
  .pred-opt.home-sel  { border-color: ${C.green}; color: ${C.green}; background: rgba(76,175,122,0.1); }
  .pred-opt.draw-sel  { border-color: ${C.gold};  color: ${C.gold};  background: ${C.goldFaint}; }
  .pred-opt.away-sel  { border-color: ${C.blue};  color: ${C.blue};  background: rgba(74,155,232,0.1); }

  /* ── TABLES ── */
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th { font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 600; letter-spacing: 1.5px;
    text-transform: uppercase; color: ${C.goldDim}; padding: 10px 14px; border-bottom: 1px solid ${C.border}; text-align: left; white-space: nowrap; }
  .data-table td { padding: 11px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 14px; }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: rgba(255,255,255,0.02); }
  .data-table tr.me td { background: rgba(201,168,76,0.04); }

  /* ── HERO ── */
  .hero { padding: 60px 0 40px; text-align: center; }
  .hero-title { font-family: 'Oswald'; font-size: clamp(44px, 7vw, 88px); font-weight: 700; line-height: 0.92;
    letter-spacing: 2px; text-transform: uppercase; color: ${C.text}; margin-bottom: 10px; }
  .hero-title em { font-style: normal; color: ${C.gold}; }
  .hero-sub { font-size: 16px; font-weight: 300; color: ${C.textDim}; max-width: 480px; margin: 0 auto 32px; line-height: 1.6; }

  /* ── STATS ── */
  .stat-box   { padding: 20px; }
  .stat-num   { font-family: 'Oswald'; font-size: 36px; font-weight: 700; color: ${C.gold}; line-height: 1; }
  .stat-label { font-family: 'Barlow Condensed'; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: ${C.textDim}; margin-top: 5px; }

  /* ── SECTION ── */
  .section { padding: 28px 0; }
  .section-head  { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; gap: 12px; flex-wrap: wrap; }
  .section-title { font-family: 'Oswald'; font-size: 22px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: ${C.text}; }
  .section-title span { color: ${C.gold}; }

  /* ── GRID ── */
  .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }

  /* ── LEADERBOARD ── */
  .rank-num { font-family: 'Oswald'; font-size: 20px; font-weight: 700; color: ${C.textDim}; }
  .rank-1 .rank-num { color: #FFD700; }
  .rank-2 .rank-num { color: #C0C0C0; }
  .rank-3 .rank-num { color: #CD7F32; }
  .progress-track { height: 4px; background: rgba(255,255,255,0.07); border-radius: 2px; overflow: hidden; }
  .progress-fill  { height: 100%; border-radius: 2px; background: linear-gradient(90deg, ${C.gold}, ${C.goldLight}); transition: width 0.5s; }

  /* ── TOAST ── */
  .toast { position: fixed; top: 72px; right: 20px; z-index: 9999; min-width: 280px; padding: 14px 18px;
    border-radius: 10px; backdrop-filter: blur(20px); font-size: 14px; font-weight: 500;
    display: flex; align-items: center; gap: 10px; animation: toastIn 0.3s cubic-bezier(.34,1.56,.64,1); }
  .toast-success { background: rgba(76,175,122,0.2);  border: 1px solid rgba(76,175,122,0.5); color: #8DE8B2; }
  .toast-error   { background: rgba(224,85,85,0.2);   border: 1px solid rgba(224,85,85,0.5);  color: #F0A0A0; }
  .toast-info    { background: rgba(74,155,232,0.2);  border: 1px solid rgba(74,155,232,0.4); color: #9EC8F5; }
  .toast-warn    { background: rgba(232,148,58,0.2);  border: 1px solid rgba(232,148,58,0.4); color: #F0C080; }
  @keyframes toastIn { from { opacity: 0; transform: translateX(40px) scale(0.9); } to { opacity: 1; transform: none; } }

  /* ── MODAL ── */
  .modal-bg  { position: fixed; inset: 0; z-index: 500; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal-box { background: ${C.bg2}; border: 1px solid ${C.goldBorder}; border-radius: 16px; padding: 32px;
    width: 100%; max-width: 500px; animation: modalIn 0.28s cubic-bezier(.34,1.4,.64,1); max-height: 90vh; overflow-y: auto; }
  @keyframes modalIn { from { opacity: 0; transform: scale(0.88) translateY(20px); } to { opacity: 1; transform: none; } }
  .modal-title { font-family: 'Oswald'; font-size: 24px; font-weight: 600; letter-spacing: 2px;
    text-transform: uppercase; color: ${C.gold}; margin-bottom: 24px; }

  /* ── INFO BOXES ── */
  .lock-warning   { background: rgba(232,148,58,0.1); border: 1px solid rgba(232,148,58,0.35); border-radius: 8px; padding: 10px 13px; font-size: 13px; color: ${C.orange}; display: flex; align-items: center; gap: 8px; }
  .sealed-warning { background: rgba(224,85,85,0.1);  border: 1px solid rgba(224,85,85,0.35);  border-radius: 8px; padding: 10px 13px; font-size: 13px; color: ${C.red};    display: flex; align-items: center; gap: 8px; }
  .hcap-box       { background: rgba(139,111,212,0.08); border: 1px solid rgba(139,111,212,0.25); border-radius: 8px; padding: 10px 13px; font-size: 13px; color: #AA99DD; }
  .bet-rule-box   { background: rgba(201,168,76,0.06); border: 1px solid rgba(201,168,76,0.2);   border-radius: 8px; padding: 10px 13px; font-size: 12px; }

  /* ── MISC ── */
  .live-dot { width: 7px; height: 7px; border-radius: 50%; background: ${C.red}; display: inline-block;
    animation: livePulse 1.2s ease-in-out infinite; }
  @keyframes livePulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.7); } }
  .divider { height: 1px; background: ${C.border}; margin: 24px 0; }
  .tab-row { display: flex; gap: 4px; border-bottom: 1px solid ${C.border}; margin-bottom: 20px; overflow-x: auto; }
  .tab-btn { background: none; border: none; border-bottom: 2px solid transparent; padding: 8px 16px;
    font-family: 'Barlow Condensed'; font-size: 12px; font-weight: 600; letter-spacing: 1px;
    text-transform: uppercase; color: ${C.textDim}; cursor: pointer; white-space: nowrap; transition: all 0.2s; margin-bottom: -1px; }
  .tab-btn:hover { color: ${C.text}; }
  .tab-btn.active { color: ${C.gold}; border-bottom-color: ${C.gold}; }

  /* ── ADMIN ── */
  .admin-grid    { display: grid; grid-template-columns: 230px 1fr; gap: 20px; }
  .admin-sidebar { display: flex; flex-direction: column; gap: 3px; }
  .admin-nav-item { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: 8px;
    cursor: pointer; font-family: 'Barlow Condensed'; font-size: 13px; font-weight: 600; letter-spacing: 1px;
    text-transform: uppercase; color: ${C.textDim}; border: 1px solid transparent; transition: all 0.18s; }
  .admin-nav-item:hover  { background: rgba(255,255,255,0.04); color: ${C.text}; }
  .admin-nav-item.active { background: ${C.goldFaint}; border-color: ${C.goldBorder}; color: ${C.gold}; }

  /* ── ROUND CHIPS ── */
  .round-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .round-chip { padding: 5px 12px; border-radius: 20px; border: 1px solid ${C.border}; background: transparent;
    color: ${C.textDim}; font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 600; letter-spacing: 1px;
    text-transform: uppercase; cursor: pointer; transition: all 0.18s; }
  .round-chip:hover  { border-color: ${C.goldBorder}; color: ${C.gold}; }
  .round-chip.active { border-color: ${C.gold}; color: ${C.gold}; background: ${C.goldFaint}; }

  /* ── MONEY ── */
  .money-positive { color: ${C.green}; font-weight: 700; font-family: 'Oswald'; }
  .money-negative { color: ${C.red};   font-weight: 700; font-family: 'Oswald'; }

  /* ── ANIMATIONS ── */
  @keyframes confettiFall { to { top: 110vh; transform: rotate(720deg); opacity: 0; } }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .grid-3, .grid-4 { grid-template-columns: 1fr 1fr; }
    .grid-2 { grid-template-columns: 1fr; }
    .admin-grid { grid-template-columns: 1fr; }
    .admin-sidebar { flex-direction: row; flex-wrap: wrap; }
  }
  @media (max-width: 520px) {
    .grid-3, .grid-4, .grid-2 { grid-template-columns: 1fr; }
  }
`;

export default globalCss;
