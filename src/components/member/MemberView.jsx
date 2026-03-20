// src/components/member/MemberView.jsx
import React, { useState } from "react";
import NavBar from "../shared/NavBar";
import MatchLeaderboard from "../shared/MatchLeaderboard";
import SeasonTable from "../shared/SeasonTable";
import SubmissionFlow from "./SubmissionFlow";

export default function MemberView({
  db,
  session,
  isAdmin,
  metaGame,
  currentMatch,
  currentMatchId,
  matchPlayers,
  allTeams,
  allMembers,
  seasonTotals,
  localTeam,
  setLocalTeam,
  onLogout,
  onBackToAdmin,
  showToast,
}) {
  const [tab, setTab] = useState("team");

  const locked = currentMatch.locked || currentMatch.finalized;
  const revealed = currentMatch.revealed || currentMatch.finalized;
  const noMatch = !currentMatchId || !currentMatch.label;
  const isIPL = currentMatch.isIPL !== false;

  function renderTeamTab() {
    return (
      <SubmissionFlow
        db={db}
        currentMatchId={currentMatchId}
        currentMatch={currentMatch}
        matchPlayers={matchPlayers}
        allTeams={allTeams}
        allMembers={allMembers}
        session={session}
        isIPL={isIPL}
        localTeam={localTeam}
        setLocalTeam={setLocalTeam}
        showToast={showToast}
      />
    );
  }

  function renderLiveTab() {
    if (noMatch) {
      return (
        <div className="empty-state">
          <div className="es-icon">📺</div>
          <p className="muted">No match in progress.</p>
        </div>
      );
    }
    if (!revealed) {
      return (
        <div className="empty-state">
          <div className="es-icon">🔒</div>
          <p>Live scores appear after the toss reveal.</p>
        </div>
      );
    }
    if (!locked) {
      return (
        <div className="empty-state">
          <div className="es-icon">⏳</div>
          <p>Toss is done — teams visible on My Team tab.</p>
          <p className="muted">
            Leaderboard goes live once teams are locked (~10 mins before play).
          </p>
        </div>
      );
    }
    return (
      <MatchLeaderboard
        match={currentMatch}
        allMembers={allMembers}
        highlightName={session}
      />
    );
  }

  function renderSeasonTab() {
    return (
      <SeasonTable
        allMembers={allMembers}
        seasonTotals={seasonTotals}
        highlightName={session}
      />
    );
  }

  return (
    <div className="screen-main">
      <NavBar
        session={session}
        isAdmin={isAdmin}
        onLogout={onLogout}
        onBackToAdmin={onBackToAdmin}
      />

      <div className="view-tabs">
        {[
          ["team", "My Team"],
          ["live", "Live Scores"],
          ["season", "Season Table"],
        ].map(([t, label]) => (
          <button
            key={t}
            className={`vtab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "team" && renderTeamTab()}
      {tab === "live" && renderLiveTab()}
      {tab === "season" && renderSeasonTab()}
    </div>
  );
}
