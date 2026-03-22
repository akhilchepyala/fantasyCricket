// src/components/member/MemberView.jsx
import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
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
  const { activeMatches } = useApp();
  const [tab, setTab] = useState("team");
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [localTeams, setLocalTeams] = useState({});

  const activeMatchIds = metaGame.activeMatchIds || [];
  const allActiveIds = Array.from(
    new Set([...(currentMatchId ? [currentMatchId] : []), ...activeMatchIds]),
  );

  const effectiveMatchId = selectedMatchId || currentMatchId;
  const effectiveMatch =
    (activeMatches[effectiveMatchId] || {}).match || currentMatch;
  const effectivePlayers =
    (activeMatches[effectiveMatchId] || {}).players || matchPlayers;
  const effectiveTeams =
    (activeMatches[effectiveMatchId] || {}).teams || allTeams;

  const effectiveLocalTeam = localTeams[effectiveMatchId] || {
    players: [],
    captain: "",
    vc: "",
  };

  function setEffectiveLocalTeam(val) {
    setLocalTeams((prev) => {
      const cur = prev[effectiveMatchId] || {
        players: [],
        captain: "",
        vc: "",
      };
      const next = typeof val === "function" ? val(cur) : val;
      if (effectiveMatchId === currentMatchId) setLocalTeam(next);
      return { ...prev, [effectiveMatchId]: next };
    });
  }

  const locked = effectiveMatch.locked || effectiveMatch.finalized || false;
  const revealed = effectiveMatch.revealed || effectiveMatch.finalized || false;
  const noMatch = !effectiveMatchId || !effectiveMatch.label;
  const isIPL = effectiveMatch.isIPL !== false;

  function renderLiveContent() {
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
        match={effectiveMatch}
        allMembers={allMembers}
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
            className={"vtab" + (tab === t ? " active" : "")}
            onClick={() => setTab(t)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Single match selector — always visible when multiple matches active, drives all tabs */}
      {allActiveIds.length > 1 && (
        <div style={{ padding: "10px 16px 0" }}>
          <div className="match-label-sm" style={{ marginBottom: 6 }}>
            SELECT MATCH
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 4,
            }}
          >
            {allActiveIds.map((mid) => {
              const m = (activeMatches[mid] || {}).match || {};
              return (
                <button
                  key={mid}
                  className={
                    "mt-btn" + (effectiveMatchId === mid ? " mt-active" : "")
                  }
                  style={{ fontSize: 12 }}
                  onClick={() => setSelectedMatchId(mid)}
                >
                  {m.label || mid}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* My Team — always mounted to preserve SubmissionFlow state across tab switches */}
      <div style={{ display: tab === "team" ? "block" : "none" }}>
        <SubmissionFlow
          key={effectiveMatchId}
          db={db}
          currentMatchId={effectiveMatchId}
          currentMatch={effectiveMatch}
          matchPlayers={effectivePlayers}
          allTeams={effectiveTeams}
          allMembers={allMembers}
          session={session}
          isIPL={isIPL}
          localTeam={effectiveLocalTeam}
          setLocalTeam={setEffectiveLocalTeam}
          showToast={showToast}
        />
      </div>

      {/* Live Scores */}
      <div style={{ display: tab === "live" ? "block" : "none" }}>
        {renderLiveContent()}
      </div>

      {/* Season Table */}
      <div style={{ display: tab === "season" ? "block" : "none" }}>
        <SeasonTable
          allMembers={allMembers}
          seasonTotals={seasonTotals}
          highlightName={session}
        />
      </div>
    </div>
  );
}
