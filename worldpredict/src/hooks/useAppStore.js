import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ROUNDS, DEFAULT_BET_RULES } from "../constants";
import { store, shouldBeLocked, matchStatusType } from "../utils/helpers";
import api from "../services/api";

export function useAppStore() {
  const [page,         setPage]         = useState("home");
  const [currentUser,  setCurrentUser]  = useState(() => store.get("wp_user", null));
  const [matches,      setMatches]      = useState([]);
  const [predictions,  setPredictions]  = useState([]);
  const [users,        setUsers]        = useState([]);
  const [betRules,     setBetRules]     = useState(DEFAULT_BET_RULES);
  const [predResults,  setPredResults]  = useState([]);
  const [toast,        setToast]        = useState(null);
  const [modal,        setModal]        = useState(null);
  const [confetti,     setConfetti]     = useState(false);
  const [roundFilter,  setRoundFilter]  = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [backendMode,  setBackendMode]  = useState(false);
  const [myStats,      setMyStats]      = useState(null);
  const lockTimerRef    = useRef(null);
  const syncIntervalRef = useRef(null);

  // ── Load backend khi khởi động ─────────────────────────────────────────────
  useEffect(() => {
    const token = store.get("wp_token", null);
    if (token) {
      api.setToken(token);
    }
    loadBackendData();
  }, []);

  async function loadBackendData() {
    try {
      const [matchData, betData, userData] = await Promise.all([
        api.getMatches(),
        api.getBetRules(),
        api.getUsers(),
      ]);

      setMatches(matchData || []);
      setBetRules(betData || {});
      setUsers(userData || []);

      setBackendMode(true);

      // Load myStats ngay khi khởi động nếu đã đăng nhập (không cần chờ sync interval)
      const token = store.get("wp_token", null);
      if (token) {
        try {
          const stats = await api.getUserStats();
          setMyStats(stats);
        } catch (_) {}
      }
    } catch (e) {
      console.error("Load backend failed:", e);
      setBackendMode(false);
    }
  }

  // ── Auto-sync predictions khi backend mode ─────────────────────────────────
  useEffect(() => {
    if (backendMode && currentUser) {
      const sync = async () => {
        try {
          const [preds, freshUsers, stats] = await Promise.all([
            api.getPredictions(),
            api.getUsers(),
            api.getUserStats(),
          ]);

          setPredictions(preds);
          setUsers(freshUsers || []);

          // Sync lại currentUser từ danh sách users mới nhất (cập nhật points, isActive...)
          const freshMe = (freshUsers || []).find(u => u.id === currentUser.id);
          if (freshMe) {
            setCurrentUser(prev => ({ ...prev, ...freshMe }));
            store.set("wp_user", { ...currentUser, ...freshMe });
          }

          const results = preds
            .filter(p => p.result !== null)
            .map(p => ({
              id:           p.id,
              predictionId: p.id,
              userId:       p.userId,
              matchId:      p.matchId,
              isCorrect:    p.result.isCorrect,
              pointChange:  p.result.pointChange,
              reason:       p.result.reason,
              calculatedAt: p.result.calculatedAt,
            }));
          setPredResults(results);

          // Lấy stats chuẩn từ DB (bao gồm cả no_prediction)
          setMyStats(stats);

        } catch (_) {}
      };
      sync();
      syncIntervalRef.current = setInterval(sync, 15_000);

      // Sync ngay khi user quay lại tab
      const onVisible = () => { if (document.visibilityState === "visible") sync(); };
      document.addEventListener("visibilitychange", onVisible);

      return () => {
        clearInterval(syncIntervalRef.current);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }
  }, [backendMode, currentUser]);

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
    try {
      const { token, user } = await api.login(username, password);

      api.setToken(token);
      store.set("wp_token", token);

      setCurrentUser(user);
      setModal(null);

      showToast(`Chào mừng, ${user.fullName}! 🎉`);

      setConfetti(true);
      setTimeout(() => setConfetti(false), 3000);

      await loadBackendData();

      return true;
    } catch (e) {
      showToast(e.message, "error");
      return false;
    }
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
    try {
      if (!currentUser) {
        showToast("Vui lòng đăng nhập", "error");
        return;
      }

      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      if (match.isLocked || shouldBeLocked(match.matchDate)) {
        showToast("🔒 Trận đã bị khóa dự đoán", "error");
        return;
      }

      if (match.resultLocked) {
        showToast("Kết quả đã được niêm phong", "error");
        return;
      }

      const res = await api.predict(matchId, choice);
      showToast(res.message || "Dự đoán đã lưu ✓");

      const updated = await api.getPredictions();
      setPredictions(updated);

    } catch (e) {
      showToast(e.message || "Lỗi khi gửi dự đoán", "error");
    }
  }

  // ── Set Result ──────────────────────────────────────────────────────────────
  async function doSetResult(matchId, homeGoals, awayGoals) {
    const hg = parseInt(homeGoals);
    const ag = parseInt(awayGoals);

    if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) {
      showToast("Nhập tỷ số hợp lệ", "error");
      return;
    }

    try {
      await api.setResult(matchId, hg, ag);

      setMatches(await api.getMatches());
      setUsers(await api.getUsers());

      showToast("✅ Kết quả đã lưu và niêm phong!", "success");

      setModal(null);
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  // ── Set Handicap ─────────────────────────────────────────────────────────────
  async function doSetHandicap(matchId, handicap) {
    try {
      await api.setHandicap(
        matchId,
        handicap === "" || handicap === null ? null : parseFloat(handicap)
      );

      setMatches(await api.getMatches());

      showToast("Đã lưu kèo chấp", "success");

      setModal(null);
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  // ── Create User (admin) ──────────────────────────────────────────────────────
  async function doCreateUser(username, password, fullName, phone) {
    if (!username?.trim() || !password) {
      showToast("Thiếu thông tin", "error");
      return false;
    }

    try {
      await api.createUser({ username, password, fullName, phone });

      setUsers(await api.getUsers());

      showToast(`Đã tạo tài khoản: ${username}`, "success");

      return true;
    } catch (e) {
      showToast(e.message, "error");
      return false;
    }
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
        if (r.reason === "win")       { correct++; roundStats[rk].correct++; }
        else if (r.reason === "lose") { wrong++;   roundStats[rk].wrong++;   }
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

  // Override stats của chính mình bằng dữ liệu chuẩn từ DB
  // myStats lấy từ /api/users/my-stats — bao gồm đủ win/lose/no_prediction
  const myLbEntryFinal = (myLbEntry && myStats) ? {
    ...myLbEntry,
    correct:  myStats.correct,
    wrong:    myStats.wrong,
    noPred:   myStats.noPred,
    accuracy: myStats.accuracy,
  } : myLbEntry;

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
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      showToast(res.message || "Đổi mật khẩu thành công", "success");
      return true;
    } catch (e) {
      showToast(e.message || "Đổi mật khẩu thất bại", "error");
      return false;
    }
  }

  return {
    page, setPage, currentUser, setCurrentUser,
    matches, setMatches, predictions, users, setUsers,
    betRules, setBetRules, predResults, toast, modal, setModal, confetti,
    roundFilter, setRoundFilter, statusFilter, setStatusFilter, backendMode,
    leaderboard, myLbEntry: myLbEntryFinal, myRank, filteredMatches,
    showToast,
    doLogin, doLogout,
    doPredict, doSetResult, doSetHandicap, doCreateUser,
    getUserPred,
    doChangePassword,
  };
}
