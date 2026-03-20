// src/components/member/MyTeamCard.jsx
import React from "react";
import { calcPoints } from "../../utils/points";
import { getCredits, teamSpend } from "../../utils/team";
import { ROLE_ICONS } from "../../constants/rules";

export default function MyTeamCard({
  team,
  match,
  memberName,
  allMembers,
  matchPlayers,
  onEditTeam,
}) {
  const players    = team.players || [];
  const cap        = team.captain;
  const vc         = team.vc;
  const stats      = match.stats || {};
  const isRevealed = match.revealed || match.finalized;

  // Group players by role
  const byRole = { WK: [], BAT: [], AR: [], BOWL: [] };
  players.forEach((p) => {
    const pObj = matchPlayers.find((x) => x.name === p) || { role: "BAT", team: "" };
    const role = pObj.role || "BAT";
    if (!byRole[role]) byRole[role] = [];
    byRole[role].push({
      name: p,
      role,
      team:  pObj.team,
      cr:    getCredits(p),
      isC:   p === cap,
      isV:   p === vc,
    });
  });

  const totalCR  = teamSpend(players);
  const totalPts = isRevealed
    ? Math.round(
        players.reduce((acc, p) => {
          let pts = calcPoints(stats[p] || {});
          if (p === cap) pts *= 2;
          else if (p === vc) pts *= 1.5;
          return acc + pts;
        }, 0)
      )
    : 0;

  return (
    <div className="my-team-card">
      {/* Header */}
      <div className="mtc-header">
        <div>
          <div className="mtc-match">{match.label || "Current Match"}</div>
          <div className="mtc-teamname">
            {allMembers[memberName]?.teamName || memberName}
          </div>
        </div>
        <div className="mtc-summary">
          <div className="mtc-stat">
            <span>{totalCR}</span>
            <em>CR used</em>
          </div>
          {isRevealed && (
            <div className="mtc-stat mtc-pts-total">
              <span>{totalPts}</span>
              <em>total pts</em>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="mtc-status-bar">
        <span className="pill pill-green">✅ Team Submitted</span>
        <span style={{ fontSize: 12, color: "var(--muted2)" }}>
          {match.locked
            ? "🔒 Locked — match underway"
            : "🥁 Toss done · can still edit"}
        </span>
      </div>

      {/* Players by role */}
      {["WK", "BAT", "AR", "BOWL"].map((role) =>
        byRole[role]?.length ? (
          <div key={role} className="mtc-section">
            <div className="mtc-section-label">
              {ROLE_ICONS[role]} {role}
            </div>
            {byRole[role].map((p) => {
              const rawPts   = isRevealed ? calcPoints(stats[p.name] || {}) : null;
              const finalPts =
                rawPts !== null
                  ? p.isC
                    ? rawPts * 2
                    : p.isV
                    ? rawPts * 1.5
                    : rawPts
                  : null;
              return (
                <div
                  key={p.name}
                  className={`mtc-row ${p.isC ? "mtc-c" : p.isV ? "mtc-v" : ""}`}
                >
                  <div className="mtc-role">{ROLE_ICONS[p.role] || ""}</div>
                  <div className="mtc-info">
                    <div className="mtc-name">
                      {p.name}
                      {p.isC && <span className="mtc-badge mtc-badge-c">C</span>}
                      {p.isV && <span className="mtc-badge mtc-badge-v">VC</span>}
                    </div>
                    <div className="mtc-meta">
                      {p.team} ·{" "}
                      <span style={{ color: "var(--gold)" }}>{p.cr}CR</span>
                    </div>
                  </div>
                  {finalPts !== null && (
                    <div className="mtc-pts">
                      {Math.round(finalPts)}
                      <span>pts</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null
      )}

      {/* Edit button (only before lock) */}
      {!match.locked && (
        <div style={{ padding: "10px 18px 14px" }}>
          <button className="btn-ghost" style={{ width: "100%" }} onClick={onEditTeam}>
            ✏️ Edit Team
          </button>
        </div>
      )}
    </div>
  );
}
