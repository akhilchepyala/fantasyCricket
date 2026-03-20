// src/components/admin/AdminView.jsx
import React, { useState } from "react";
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
  const [tab, setTab] = useState("match");

  const revealed = currentMatch.revealed || currentMatch.finalized;

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

      {/* ── Current Match tab ── */}
      {tab === "match" && (
        <div className="admin-2col">
          {/* LEFT: match control + submissions */}
          <div className="acol">
            <MatchControl
              db={db}
              currentMatchId={currentMatchId}
              currentMatch={currentMatch}
              matchPlayers={matchPlayers}
              allTeams={allTeams}
              allMembers={allMembers}
              playerStats={playerStats}
              showToast={showToast}
            />
          </div>

          {/* RIGHT: player pool + leaderboard */}
          <div className="acol">
            <PlayerPool
              db={db}
              currentMatchId={currentMatchId}
              currentMatch={currentMatch}
              matchPlayers={matchPlayers}
              metaGame={metaGame}
              showToast={showToast}
            />
            {revealed && (
              <MatchLeaderboard
                match={currentMatch}
                allMembers={allMembers}
                highlightName={null}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Player Stats tab ── */}
      {tab === "stats" && (
        <PlayerStats
          db={db}
          currentMatchId={currentMatchId}
          currentMatch={currentMatch}
          matchPlayers={matchPlayers}
          arActive={arActive}
          arSecs={arSecs}
          onToggleAR={onToggleAR}
          autoFetchStats={autoFetchStats}
          showToast={showToast}
        />
      )}

      {/* ── Season Table tab ── */}
      {tab === "season" && (
        <AdminSeason
          allMembers={allMembers}
          seasonTotals={seasonTotals}
          showToast={showToast}
        />
      )}

      {/* ── League Setup tab ── */}
      {tab === "league" && (
        <LeagueSetup
          db={db}
          metaGame={metaGame}
          allMembers={allMembers}
          allTeams={allTeams}
          currentMatchId={currentMatchId}
          currentMatch={currentMatch}
          showToast={showToast}
          onPickMyTeam={onPickMyTeam}
        />
      )}
    </div>
  );
}
