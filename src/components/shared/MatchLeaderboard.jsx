// src/components/shared/MatchLeaderboard.jsx
import React from "react";
import { calcPoints } from "../../utils/points";
import { lastName } from "../../utils/team";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function MatchLeaderboard({ match, allMembers, highlightName }) {
  const stats  = match.stats  || {};
  const teams  = match.teams  || {};
  const members = Object.keys(allMembers);

  const ranked = members
    .map((name) => {
      const t = teams[name] || {};
      const total = Math.round(
        (t.players || []).reduce((acc, p) => {
          let pts = calcPoints(stats[p]);
          if (p === t.captain) pts *= 2;
          else if (p === t.vc) pts *= 1.5;
          return acc + pts;
        }, 0)
      );
      return { name, total, team: t, teamName: allMembers[name]?.teamName || name };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <>
      <div className="reveal-banner">
        <div className="rb-eye">
          🏏 {match.finalized ? "MATCH FINAL" : "LIVE SCORES"}
        </div>
        <div className="rb-title">{match.label || "Match"}</div>
        <div className="rb-sub">
          {match.finalized
            ? "Points saved to season table"
            : "Updates every few minutes"}
        </div>
      </div>

      <div className="lb-list">
        {ranked.map((r, i) => (
          <div
            key={r.name}
            className={`lb-card ${r.name === highlightName ? "lb-me" : ""} ${
              i === 0 ? "lb-top" : ""
            }`}
          >
            <div className="lb-med">{MEDALS[i] || "#" + (i + 1)}</div>
            <div className="lb-body">
              <div className="lb-name">
                {r.name}
                {r.name === highlightName && <span className="you">YOU</span>}
              </div>
              <div className="lb-tname">{r.teamName}</div>
              <div className="lb-chips">
                {(r.team.players || []).length === 0 ? (
                  <span className="muted-s">No team submitted</span>
                ) : (
                  (r.team.players || []).map((p) => {
                    let pts = calcPoints(stats[p]);
                    const isC = p === r.team.captain;
                    const isV = p === r.team.vc;
                    if (isC) pts *= 2;
                    else if (isV) pts *= 1.5;
                    return (
                      <span
                        key={p}
                        className={`lchip ${isC ? "lchip-c" : isV ? "lchip-vc" : ""}`}
                      >
                        {isC ? "©" : isV ? "ᵛ" : ""}
                        {lastName(p)} <em>{Math.round(pts)}</em>
                      </span>
                    );
                  })
                )}
              </div>
            </div>
            <div className="lb-score">
              {r.total}
              <span>pts</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
