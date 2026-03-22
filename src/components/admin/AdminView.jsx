// src/components/admin/AdminView.jsx
import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import NavBar from "../shared/NavBar";
import MatchLeaderboard from "../shared/MatchLeaderboard";
import MatchControl from "./MatchControl";
import PlayerPool from "./PlayerPool";
import PlayerStats from "./PlayerStats";
import AdminSeason from "./AdminSeason";
import LeagueSetup from "./LeagueSetup";

export default function AdminView({
  db,
  metaGame,
  currentMatch,
  currentMatchId,
  matchPlayers,
  allTeams,
  allMembers,
  seasonTotals,
  playerStats,
  arActive,
  arSecs,
  onToggleAR,
  autoFetchStats,
  onLogout,
  onPickMyTeam,
  showToast,
}) {
  const { activeMatches } = useApp();
  const [tab, setTab] = useState("match");
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  const activeMatchIds = metaGame.activeMatchIds || [];
  const allActiveIds = Array.from(
    new Set([...(currentMatchId ? [currentMatchId] : []), ...activeMatchIds]),
  );
  const multiMatch = allActiveIds.length > 1;

  // One selected match drives everything
  const effectiveId = selectedMatchId || currentMatchId;
  const selMatch = (activeMatches[effectiveId] || {}).match || {};
  const selPlayers = (activeMatches[effectiveId] || {}).players || [];
  const selTeams = (activeMatches[effectiveId] || {}).teams || {};
  const selStats = (activeMatches[effectiveId] || {}).stats || {};

  // Single selector rendered once, above the 2-col layout
  const matchSelector = multiMatch ? (
    <div className="acard" style={{ padding: "10px 14px", marginBottom: 12 }}>
      <div className="match-label-sm" style={{ marginBottom: 6 }}>
        SELECT MATCH
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {allActiveIds.map((mid) => {
          const m = (activeMatches[mid] || {}).match || {};
          return (
            <button
              key={mid}
              className={"mt-btn" + (effectiveId === mid ? " mt-active" : "")}
              style={{ fontSize: 12, opacity: m.finalized ? 0.65 : 1 }}
              onClick={() => setSelectedMatchId(mid)}
            >
              {m.label || mid}
              {m.finalized ? " \u2713" : ""}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div className="screen-main">
      <NavBar
        session={null}
        isAdmin={true}
        onLogout={onLogout}
        onBackToAdmin={() => {}}
        onPickMyTeam={onPickMyTeam}
      />

      <div className="view-tabs">
        {[
          ["match", "Current Match"],
          ["stats", "Player Stats"],
          ["season", "Season Table"],
          ["league", "League Setup"],
        ].map(([t, lbl]) => (
          <button
            key={t}
            className={"vtab" + (tab === t ? " active" : "")}
            onClick={() => setTab(t)}
          >
            {lbl}
          </button>
        ))}
      </div>

      {tab === "match" && (
        <>
          {matchSelector}
          <div className="admin-2col">
            <div className="acol">
              <MatchControl
                db={db}
                currentMatchId={effectiveId}
                currentMatch={selMatch}
                matchPlayers={selPlayers}
                allTeams={selTeams}
                allMembers={allMembers}
                playerStats={selStats}
                metaGame={metaGame}
                activeMatches={activeMatches}
                showToast={showToast}
              />
            </div>
            <div className="acol">
              <PlayerPool
                db={db}
                currentMatchId={effectiveId}
                currentMatch={selMatch}
                matchPlayers={selPlayers}
                metaGame={metaGame}
                onPickMyTeam={onPickMyTeam}
                showToast={showToast}
              />
              {/* Leaderboard for the selected match if revealed/finalized */}
              {(selMatch.revealed || selMatch.finalized) && (
                <MatchLeaderboard
                  match={selMatch}
                  allMembers={allMembers}
                  highlightName={null}
                />
              )}
            </div>
          </div>
        </>
      )}

      {tab === "stats" && (
        <>
          {matchSelector}
          <PlayerStats
            db={db}
            currentMatchId={effectiveId}
            currentMatch={selMatch}
            matchPlayers={selPlayers}
            arActive={arActive}
            arSecs={arSecs}
            onToggleAR={onToggleAR}
            autoFetchStats={autoFetchStats}
            showToast={showToast}
          />
        </>
      )}

      {tab === "season" && (
        <AdminSeason
          allMembers={allMembers}
          seasonTotals={seasonTotals}
          showToast={showToast}
        />
      )}

      {tab === "league" && (
        <LeagueSetup
          db={db}
          metaGame={metaGame}
          allMembers={allMembers}
          allTeams={selTeams}
          currentMatchId={effectiveId}
          currentMatch={selMatch}
          showToast={showToast}
          onPickMyTeam={onPickMyTeam}
        />
      )}
    </div>
  );
}
