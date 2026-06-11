import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ROUNDS, DEFAULT_BET_RULES, USE_MOCK } from "../constants";
import { store, shouldBeLocked, getMatchResult, matchStatusType } from "../utils/helpers";
import { makeMockMatches, makeTestScenario, DEFAULT_ADMIN } from "../utils/mockData";
import api from "../services/api";

export function useAppStore() {
  const [page,         setPage]         = useState("home");
  const [currentUser,  setCurrentUser]  = useState(() => store.get("wp_user", null));
  // ── Khởi tạo matches với mock data luôn — backend sẽ override nếu available ──
  const [matches,      setMatches]      = useState(() => store.get("wp_matches", null) || []);
  const [predictions,  setPredictions]  = useState(() => store.get("wp_preds",   []));
  const [users,        setUsers]        = useState(() => store.get("wp_users",   [DEFAULT_ADMIN]));
  const [betRules,     setBetRules]     = useState(() => store.get("wp_betrules", DEFAULT_BET_RULES));
  const [predResults,  setPredResults]  = useState(() => store.get("wp_results", []));
  const [toast,        setToast]        = useState(null);
  const [modal,        setModal]        = useState(null);
  const [confetti,     setConfetti]     = useState(false);
  const [roundFilter,  setRoundFilter]  = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [backendMode,  setBackendMode]  = useState(false);  // false cho đến khi xác nhận backend OK
  const lockTimerRef   = useRef(null);
  const syncIntervalRef = useRef(null);

  // ── Load backend khi khởi động ─────────────────────────────────────────────
  useEffect(() => {
    const token = store.get("wp_token", null);
    if (token) api.setToken(token);
    if (!USE_MOCK) loadBackendData();
  }, []);

  async function loadBackendData() {
    try {
      const [matchData, betData] = await Promise.all([
        api.getMatches(),
        api.getBetRules(),
      ]);
      // Chỉ override nếu backend thật sự trả về dữ liệu
      if (matchData && matchData.length > 0) {
        setMatches(matchData);
      }
      // Nếu backend trả về rỗng (chưa import fixtures), giữ mock data
      setBetRules(betData);
      setBackendMode(true);
    } catch (e) {
      console.warn("⚠️ Backend không khả dụng → dùng Mock Data:", e.message);
      setBackendMode(false);
      // Giữ nguyên mock data đã khởi tạo ở trên — không set rỗng
    }
  }

  // ── Auto-sync predictions khi backend mode ─────────────────────────────────
  useEffect(() => {
    if (!USE_MOCK && backendMode && currentUser) {
      const sync = async () => {
        try {
          const preds = await api.getPredictions();
          setPredictions(preds);
        } catch (_) {}
      };
      sync();
      syncIntervalRef.current = setInterval(sync, 60_000); // mỗi 1 phút
      return () => clearInterval(syncIntervalRef.current);
    }
  }, [backendMode, currentUser]);

  // ── Persist mock data vào localStorage ─────────────────────────────────────
  useEffect(() => { if (USE_MOCK) store.set("wp_preds",    predictions); }, [predictions]);
  useEffect(() => { if (USE_MOCK) store.set("wp_matches",  matches);     }, [matches]);
  useEffect(() => { if (USE_MOCK) store.set("wp_users",    users);       }, [users]);
  useEffect(() => { if (USE_MOCK) store.set("wp_betrules", betRules);    }, [betRules]);
  useEffect(() => { if (USE_MOCK) store.set("wp_results",  predResults); }, [predResults]);
  useEffect(() => {
    if (currentUser) store.set("wp_user", currentUser);
    else localStorage.removeItem("wp_user");
  }, [currentUser]);

  // ── Auto-lock timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    function checkLocks() {
      setMatches(prev => {
        let changed = false;
        const updated = prev.map(m => {
          if (!m.isLocked && !m.resultLocked && shouldBeLocked(m.matchDate)) {
            changed = true;
            return { ...m, isLocked: true, lockedAt: new Date().toISOString() };
          }
          return m;
        });
        return changed ? updated : prev;
      });
    }
    checkLocks();
    lockTimerRef.current = setInterval(checkLocks, 30_000);
    return () => clearInterval(lockTimerRef.current);
  }, []);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────────
  async function doLogin(username, password) {
    if (!USE_MOCK) {
      try {
        const { token, user } = await api.login(username, password);
        api.setToken(token);
        store.set("wp_token", token);
        setCurrentUser(user);
        setModal(null);
        showToast(`Chào mừng, ${user.fullName}! 🎉`);
        setConfetti(true); setTimeout(() => setConfetti(false), 3000);
        await loadBackendData();
        return true;
      } catch (e) { showToast(e.message, "error"); return false; }
    }
    // Mock mode
    const found = users.find(u =>
      u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (!found)         { showToast("Sai tên đăng nhập hoặc mật khẩu", "error"); return false; }
    if (!found.isActive){ showToast("Tài khoản đã bị vô hiệu hoá",     "error"); return false; }
    setCurrentUser(found); setModal(null);
    showToast(`Chào mừng, ${found.fullName}! 🎉`);
    setConfetti(true); setTimeout(() => setConfetti(false), 3000);
    return true;
  }

  function doLogout() {
    setCurrentUser(null);
    api.setToken(null);
    localStorage.removeItem("wp_token");
    setPage("home");
    showToast("Đã đăng xuất", "info");
  }

  // ── Predict ─────────────────────────────────────────────────────────────────
  async function doPredict(matchId, choice) {
    if (!currentUser) { showToast("Vui lòng đăng nhập", "error"); return; }
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    if (match.isLocked || shouldBeLocked(match.matchDate)) {
      showToast("🔒 Trận đã bị khóa dự đoán", "error"); return;
    }
    if (match.resultLocked) { showToast("Kết quả đã được niêm phong", "error"); return; }

    // Trận test/mock (id >= 7000) → luôn local, không gọi backend
    const isTestMatch = matchId >= 7000;

    if (!USE_MOCK && backendMode && !isTestMatch) {
      try {
        const res = await api.predict(matchId, choice);
        showToast(res.message || "Dự đoán đã lưu ✓");
        const updated = await api.getPredictions();
        setPredictions(updated);
      } catch (e) { showToast(e.message, "error"); }
      return;
    }
    // Mock / Test mode (hoặc trận test inject)
    const existing = predictions.findIndex(p => p.userId === currentUser.id && p.matchId === matchId);
    const pred = { id: Date.now(), userId: currentUser.id, matchId, choice, createdAt: new Date().toISOString() };
    const np = [...predictions];
    if (existing >= 0) np[existing] = pred; else np.push(pred);
    setPredictions(np);
    showToast(`Dự đoán "${choice === "home" ? "Nhà thắng" : choice === "away" ? "Khách thắng" : "Hòa"}" đã lưu ✓`);
  }

  // ── Set Result ──────────────────────────────────────────────────────────────
  async function doSetResult(matchId, homeGoals, awayGoals) {
    const hg = parseInt(homeGoals), ag = parseInt(awayGoals);
    if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) { showToast("Nhập tỷ số hợp lệ", "error"); return; }
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    if (match.resultLocked) { showToast("❌ Kết quả đã niêm phong!", "error"); return; }

    // Trận test/mock (id >= 7000) → luôn local
    const isTestMatch = matchId >= 7000;

    if (!USE_MOCK && backendMode && !isTestMatch) {
      try {
        await api.setResult(matchId, hg, ag);
        showToast("✅ Kết quả đã lưu và niêm phong!", "success");
        setModal(null);
        setMatches(await api.getMatches());
        setUsers(await api.getUsers());
      } catch (e) { showToast(e.message, "error"); }
      return;
    }
    // Mock / Test mode (hoặc trận test inject)
    const updated = { ...match, homeGoals: hg, awayGoals: ag, status: "FT", isLocked: true, resultLocked: true, resultSetAt: new Date().toISOString() };
    setMatches(p => p.map(m => m.id === matchId ? updated : m));
    setTimeout(() => calculateResults(matchId, hg, ag, match.handicap, match.round), 300);
    showToast("✅ Kết quả đã lưu và niêm phong!", "success");
    setModal(null);
  }

  // ── Tính điểm (mock mode) ───────────────────────────────────────────────────
  function calculateResults(matchId, hg, ag, handicap, round) {
    const rule         = betRules[round] || betRules["Vòng bảng"];
    const actualResult = getMatchResult(hg, ag, handicap);
    const newResults   = [];
    const updatedUsers = [...users];
    const matchPreds   = predictions.filter(p => p.matchId === matchId);

    matchPreds.forEach(p => {
      const isCorrect = p.choice === actualResult;
      const pts = isCorrect
        ? (rule.winPoints  ?? 3)
        : -(rule.losePoints ?? 1);
      newResults.push({ id: Date.now() + Math.random(), predictionId: p.id, userId: p.userId, matchId, isCorrect, pointChange: pts, reason: isCorrect ? "win" : "lose", calculatedAt: new Date().toISOString() });
      const ui = updatedUsers.findIndex(u => u.id === p.userId);
      if (ui >= 0) updatedUsers[ui] = { ...updatedUsers[ui], points: (updatedUsers[ui].points || 0) + pts };
    });

    const predictedIds = new Set(matchPreds.map(p => p.userId));
    updatedUsers.filter(u => u.role === "user" && u.isActive && !predictedIds.has(u.id)).forEach(u => {
      const defPts = rule.defaultLosePoints ?? 2;
      newResults.push({ id: Date.now() + Math.random(), predictionId: null, userId: u.id, matchId, isCorrect: false, pointChange: -defPts, reason: "no_prediction", calculatedAt: new Date().toISOString() });
      const ui = updatedUsers.findIndex(uu => uu.id === u.id);
      if (ui >= 0) updatedUsers[ui] = { ...updatedUsers[ui], points: (updatedUsers[ui].points || 0) - defPts };
    });

    setPredResults(p => [...p.filter(r => r.matchId !== matchId), ...newResults]);
    setUsers(updatedUsers);
    if (currentUser) {
      const updated = updatedUsers.find(u => u.id === currentUser.id);
      if (updated) setCurrentUser(updated);
    }
    showToast(`🏅 Đã tính điểm cho ${newResults.length} người`, "info");
  }

  // ── Set Handicap ─────────────────────────────────────────────────────────────
  async function doSetHandicap(matchId, handicap) {
    const match = matches.find(m => m.id === matchId);
    if (match?.resultLocked) { showToast("Kết quả đã niêm phong", "error"); return; }
    if (match?.isLocked)     { showToast("Trận đã khóa, không thể sửa kèo", "error"); return; }

    if (!USE_MOCK && backendMode) {
      try {
        await api.setHandicap(matchId, handicap === "" || handicap === null ? null : parseFloat(handicap));
        setMatches(await api.getMatches());
        showToast("Đã lưu kèo chấp", "success"); setModal(null);
      } catch (e) { showToast(e.message, "error"); }
      return;
    }
    const h = (handicap === "" || handicap === null) ? null : parseFloat(handicap);
    setMatches(p => p.map(m => m.id === matchId ? { ...m, handicap: h } : m));
    showToast(h === null ? "Đã bỏ kèo chấp" : `Kèo chấp: ${h > 0 ? "+" : ""}${h}`, "success");
    setModal(null);
  }

  // ── Create User (admin) ──────────────────────────────────────────────────────
  async function doCreateUser(username, password, fullName, phone) {
    if (!username?.trim() || !password) { showToast("Thiếu thông tin", "error"); return false; }
    if (!USE_MOCK && backendMode) {
      try {
        await api.createUser({ username, password, fullName, phone });
        setUsers(await api.getUsers());
        showToast(`Đã tạo tài khoản: ${username}`, "success"); return true;
      } catch (e) { showToast(e.message, "error"); return false; }
    }
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      showToast("Tên đã tồn tại", "error"); return false;
    }
    const newUser = { id: Date.now(), username, password, fullName: fullName || username, phone: phone || "", role: "user", points: 0, isActive: true, createdAt: new Date().toISOString() };
    setUsers(p => [...p, newUser]);
    showToast(`Đã tạo tài khoản: ${username}`, "success"); return true;
  }

  // ── Load Test Scenario — inject vào matches thật ─────────────────────────────
  function doLoadTestScenario() {
    const testMatches = makeTestScenario();
    // Xóa trận test cũ (id 8001-8099) rồi thêm mới
    setMatches(prev => [
      ...prev.filter(m => m.id < 8000 || m.id > 8099),
      ...testMatches,
    ]);
    showToast(`✅ Đã inject ${testMatches.length} trận test vào Lịch đấu`, "success");
  }

  function doClearTestScenario() {
    setMatches(prev => prev.filter(m => m.id < 8000 || m.id > 8099));
    setPredictions(prev => prev.filter(p => p.matchId < 8000 || p.matchId > 8099));
    setPredResults(prev => prev.filter(r => r.matchId < 8000 || r.matchId > 8099));
    showToast("Test Scenario đã được xóa", "info");
  }

  // ── Inject / eject trận test từ PageTest ────────────────────────────────────
  function injectTestMatches(newMatches) {
    // Xoá trận cũ có cùng ID trước, rồi thêm mới
    setMatches(prev => {
      const ids = new Set(newMatches.map(m => m.id));
      return [...prev.filter(m => !ids.has(m.id)), ...newMatches];
    });
  }

  function ejectTestMatches(ids) {
    if (!ids?.length) return;
    const idSet = new Set(ids);
    setMatches(prev => prev.filter(m => !idSet.has(m.id)));
    setPredictions(prev => prev.filter(p => !idSet.has(p.matchId)));
    setPredResults(prev => prev.filter(r => !idSet.has(r.matchId)));
  }

  // ── Leaderboard ─────────────────────────────────────────────────────────────
  const leaderboard = useMemo(() => {
    return users.filter(u => u.role === "user").map(u => {
      const myPreds   = predictions.filter(p => p.userId === u.id);
      const myResults = predResults.filter(r => r.userId === u.id);
      let correct = 0, wrong = 0, noPred = 0;
      const roundStats = {};
      ROUNDS.forEach(r => { roundStats[r] = { correct: 0, wrong: 0, noPred: 0, points: 0 }; });
      myResults.forEach(r => {
        const match = matches.find(m => m.id === r.matchId);
        const rk = ROUNDS.includes(match?.round) ? match.round : "Vòng bảng";
        if (!roundStats[rk]) roundStats[rk] = { correct: 0, wrong: 0, noPred: 0, points: 0 };
        roundStats[rk].points = (roundStats[rk].points || 0) + (r.pointChange ?? 0);
        if (r.reason === "win")  { correct++; roundStats[rk].correct++; }
        else if (r.reason === "lose") { wrong++; roundStats[rk].wrong++; }
        else { noPred++; roundStats[rk].noPred = (roundStats[rk].noPred || 0) + 1; }
      });
      const total = correct + wrong;
      return {
        ...u, correct, wrong, noPred,
        pending:  Math.max(0, myPreds.length - correct - wrong),
        total,
        accuracy: total > 0 ? Math.round(correct / total * 100) : 0,
        roundStats,
      };
    }).sort((a, b) => (b.points || 0) - (a.points || 0) || b.correct - a.correct);
  }, [users, predictions, predResults, matches]);

  const myLbEntry = leaderboard.find(u => u.id === currentUser?.id);
  const myRank    = leaderboard.findIndex(u => u.id === currentUser?.id) + 1;

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      const st = matchStatusType(m);
      if (roundFilter  !== "all" && m.round !== roundFilter) return false;
      if (statusFilter === "upcoming" && (st === "done" || st === "live")) return false;
      if (statusFilter === "live"     && st !== "live")  return false;
      if (statusFilter === "done"     && st !== "done")  return false;
      return true;
    });
  }, [matches, roundFilter, statusFilter]);

  const getUserPred = (matchId) =>
    predictions.find(p => p.userId === currentUser?.id && p.matchId === matchId);

  async function doChangePassword(currentPassword, newPassword) {
    if (!USE_MOCK) {
      try {
        const res = await api.changePassword(currentPassword, newPassword);
        showToast(res.message || "Đổi mật khẩu thành công", "success");
        return true;
      } catch (e) {
        showToast(e.message || "Đổi mật khẩu thất bại", "error");
        return false;
      }
    }
    // Mock mode
    const u = users.find(x => x.id === currentUser?.id);
    if (!u || u.password !== currentPassword) {
      showToast("Mật khẩu hiện tại không đúng", "error");
      return false;
    }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, password: newPassword } : x));
    showToast("Đổi mật khẩu thành công", "success");
    return true;
  }

  return {
    page, setPage, currentUser, setCurrentUser,
    matches, setMatches, predictions, users, setUsers,
    betRules, setBetRules, predResults, toast, modal, setModal, confetti,
    roundFilter, setRoundFilter, statusFilter, setStatusFilter, backendMode,
    leaderboard, myLbEntry, myRank, filteredMatches,
    showToast,
    doLogin, doLogout,
    doPredict, doSetResult, doSetHandicap, doCreateUser,
    doLoadTestScenario, doClearTestScenario,
    injectTestMatches, ejectTestMatches,
    getUserPred,
    doChangePassword,
  };
}
