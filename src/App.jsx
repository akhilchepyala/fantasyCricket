// src/App.jsx
import React, { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { useToast } from "./hooks/useToast";
import Toast from "./components/shared/Toast";
import LoadingScreen from "./components/shared/LoadingScreen";
import LoginScreen from "./components/auth/LoginScreen";
import JoinScreen from "./components/auth/JoinScreen";
import ReturnLoginScreen from "./components/auth/ReturnLoginScreen";
import MemberView from "./components/member/MemberView";
import AdminView from "./components/admin/AdminView";

export default function App() {
  return (
    <AppProvider>
      <AppInnerWithToast />
    </AppProvider>
  );
}

function AppInnerWithToast() {
  const [toast, showToast] = useToast();
  return (
    <>
      <AppInnerWithShowToast showToast={showToast} />
      <Toast toast={toast} />
    </>
  );
}

// We need showToast passed down, so restructure slightly
function AppInnerWithShowToast({ showToast }) {
  const {
    screen,
    session,
    db,
    metaGame,
    allMembers,
    currentMatchId,
    currentMatch,
    matchPlayers,
    allTeams,
    playerStats,
    seasonTotals,
    localTeam,
    setLocalTeam,
    arActive,
    arSecs,
    startAR,
    stopAR,
    autoFetchStats,
    urlJoinCode,
    loginAdmin,
    loginMember,
    loginMemberAsAdmin,
    logout,
    backToAdmin,
  } = useApp();

  const [showReturn, setShowReturn] = useState(false);

  function handleToggleAR(secs) {
    if (arActive) {
      stopAR();
      showToast("Auto-refresh stopped");
    } else if (secs) {
      startAR(secs);
      showToast(
        `Auto-refresh every ${secs >= 60 ? secs / 60 + " min" : secs + "s"} — ON 🟢`,
      );
    }
  }

  function handlePickMyTeam() {
    const profile = metaGame.adminProfile || {};
    if (!profile.name) {
      showToast("Save your profile first", "err");
      return;
    }
    const myTeam = allTeams[profile.name] || {};
    const team = {
      players: myTeam.players || [],
      captain: myTeam.captain || "",
      vc: myTeam.vc || "",
    };
    loginMemberAsAdmin(profile.name, team);
  }

  if (screen === "loading") return <LoadingScreen />;

  if (screen === "error") {
    return (
      <div className="screen-center">
        <p style={{ color: "#ef4444" }}>
          Firebase error — check your config in{" "}
          <code>src/firebase/config.js</code>
        </p>
      </div>
    );
  }

  if (screen === "login" && db) {
    return (
      <LoginScreen
        db={db}
        currentMatchId={currentMatchId}
        onAdminLogin={loginAdmin}
        onMemberLogin={loginMember}
      />
    );
  }

  if (screen === "join" && db) {
    if (showReturn) {
      return (
        <ReturnLoginScreen
          db={db}
          currentMatchId={currentMatchId}
          onLogin={loginMember}
          onBack={() => setShowReturn(false)}
        />
      );
    }
    return (
      <JoinScreen
        db={db}
        urlJoinCode={urlJoinCode}
        onJoined={(name) =>
          loginMember(name, { players: [], captain: "", vc: "" })
        }
        onReturnLogin={() => setShowReturn(true)}
      />
    );
  }

  if (screen === "member" && db) {
    return (
      <MemberView
        db={db}
        session={session.name}
        isAdmin={session.isAdmin}
        metaGame={metaGame}
        currentMatch={currentMatch}
        currentMatchId={currentMatchId}
        matchPlayers={matchPlayers}
        allTeams={allTeams}
        allMembers={allMembers}
        seasonTotals={seasonTotals}
        localTeam={localTeam}
        setLocalTeam={setLocalTeam}
        onLogout={logout}
        onBackToAdmin={backToAdmin}
        showToast={showToast}
      />
    );
  }

  if (screen === "admin" && db) {
    return (
      <AdminView
        db={db}
        metaGame={metaGame}
        currentMatch={currentMatch}
        currentMatchId={currentMatchId}
        matchPlayers={matchPlayers}
        allTeams={allTeams}
        allMembers={allMembers}
        seasonTotals={seasonTotals}
        playerStats={playerStats}
        arActive={arActive}
        arSecs={arSecs}
        onToggleAR={handleToggleAR}
        autoFetchStats={autoFetchStats}
        onLogout={logout}
        onPickMyTeam={handlePickMyTeam}
        showToast={showToast}
      />
    );
  }

  return <LoadingScreen />;
}
