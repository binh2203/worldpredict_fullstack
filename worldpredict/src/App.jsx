import { useAppStore } from "./hooks/useAppStore";
import globalCss from "./styles/globalCss";
import { C } from "./styles/theme";

import Navbar    from "./components/Navbar";
import Modal     from "./components/Modal";
import { Toast, Confetti } from "./components/Toast";

import PageHome        from "./pages/PageHome";
import PageMatches     from "./pages/PageMatches";
import PageLeaderboard from "./pages/PageLeaderboard";
import PageHistory     from "./pages/PageHistory";
import PageAdmin       from "./pages/PageAdmin";
import PageChangePassword from "./pages/PageChangePassword";

export default function App() {
  const store = useAppStore();
  const {
    page, setPage,
    currentUser,
    modal, setModal,
    toast, confetti,
    matches, users, predictions, predResults, betRules, setBetRules, setUsers,
    leaderboard, myLbEntry, myRank,
    filteredMatches,
    roundFilter, setRoundFilter,
    statusFilter, setStatusFilter,
    backendMode,
    showToast,
    doLogin, doLogout,
    doPredict, doSetResult, doSetHandicap,
    doCreateUser,
    doChangePassword,
    getUserPred,
  } = store;

  const sharedProps = { currentUser, betRules, predResults, getUserPred, doPredict, setModal };

  return (
    <>
      <style>{globalCss}</style>
      <div style={{ minHeight: "100vh", position: "relative" }}>
        <div className="app-bg" />
        <Confetti active={confetti} />
        <Toast toast={toast} />
        <Modal
          modal={modal} setModal={setModal}
          doLogin={doLogin}
          doSetResult={doSetResult} doSetHandicap={doSetHandicap}
        />
        <Navbar page={page} setPage={setPage} currentUser={currentUser} doLogout={doLogout} setModal={setModal} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {page === "home" && (
            <PageHome
              {...sharedProps}
              matches={matches} users={users} predictions={predictions}
              leaderboard={leaderboard} myLbEntry={myLbEntry} myRank={myRank}
              setPage={setPage}
            />
          )}
          {page === "matches" && (
            <PageMatches
              {...sharedProps}
              filteredMatches={filteredMatches}
              roundFilter={roundFilter} setRoundFilter={setRoundFilter}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            />
          )}
          {page === "leaderboard" && (
            <PageLeaderboard leaderboard={leaderboard} currentUser={currentUser} />
          )}
          {page === "history" && (
            <PageHistory
              currentUser={currentUser} predictions={predictions}
              matches={matches} predResults={predResults}
              myLbEntry={myLbEntry} setModal={setModal}
            />
          )}
          {page === "change-password" && (
            <PageChangePassword
              currentUser={currentUser}
              doChangePassword={doChangePassword}
              setPage={setPage}
            />
          )}
          {page === "admin" && (
            <PageAdmin
              {...sharedProps}
              matches={matches} predResults={predResults}
              users={users} setUsers={setUsers}
              betRules={betRules} setBetRules={setBetRules}
              filteredMatches={filteredMatches}
              roundFilter={roundFilter} setRoundFilter={setRoundFilter}
              leaderboard={leaderboard} predictions={predictions}
              showToast={showToast} doCreateUser={doCreateUser}
              backendMode={backendMode}
            />
          )}
        </div>

        <footer style={{ textAlign: "center", padding: "32px 20px", borderTop: `1px solid ${C.border}`, color: C.textFaint, fontSize: 12, fontFamily: "Barlow Condensed", letterSpacing: 2, marginTop: 40 }}>
          FIFA WORLD CUP 2026 · USA · CANADA · MEXICO<br />
          <span style={{ fontSize: 11, letterSpacing: 1 }}>World Predict 2026 — Minh bạch · Công bằng · Không thể gian lận</span>
        </footer>
      </div>
    </>
  );
}