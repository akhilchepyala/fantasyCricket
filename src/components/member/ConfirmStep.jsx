// src/components/member/ConfirmStep.jsx
import React from "react";
import { ROLE_ICONS, BUDGET } from "../../constants/rules";
import { roleCounts, teamSpend, getCredits } from "../../utils/team";

const ROLE_ORDER = ["WK", "BAT", "AR", "BOWL"];

export default function ConfirmStep({
  team,
  matchPlayers,
  onSubmit,
  onBack,
  submitting,
}) {
  const { players, captain, vc } = team;
  const spent = teamSpend(players);

  // Group players by role
  const grouped = ROLE_ORDER.reduce((acc, role) => {
    acc[role] = players.filter((name) => {
      const p = matchPlayers.find((x) => x.name === name);
      return p && p.role === role;
    });
    return acc;
  }, {});

  return (
    <div className="confirm-step">
      {/* Header */}
      <div className="xi-panel-hd">
        <div className="xi-title">CONFIRM YOUR XI</div>
        <div
          className={`xi-budget-badge ${spent > BUDGET ? "xi-budget-over" : ""}`}
        >
          {spent}/{BUDGET}CR
        </div>
      </div>

      {/* Players grouped by role */}
      <div className="xi-list">
        {ROLE_ORDER.map((role) => {
          const group = grouped[role];
          if (!group || group.length === 0) return null;
          return (
            <div key={role} className="confirm-role-group">
              <div className="confirm-role-header">
                {ROLE_ICONS[role]} {role}
              </div>
              {group.map((name) => {
                const pObj = matchPlayers.find((x) => x.name === name) || {
                  team: "",
                };
                const isC = name === captain;
                const isV = name === vc;
                return (
                  <div
                    key={name}
                    className={`xi-row ${isC ? "xi-row-c" : isV ? "xi-row-v" : ""}`}
                  >
                    <div className="xi-row-info">
                      <div className="xi-row-name">
                        {name}
                        {isC && <span className="xi-badge-c">C</span>}
                        {isV && <span className="xi-badge-v">VC</span>}
                      </div>
                      <div className="xi-row-meta">
                        {pObj.team} ·{" "}
                        <span style={{ color: "var(--gold)" }}>
                          {getCredits(name)}CR
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="confirm-actions">
        <button className="btn-lock" onClick={onSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "🔒 Submit Team"}
        </button>
        <button className="btn-back" onClick={onBack} disabled={submitting}>
          ← Back
        </button>
      </div>
    </div>
  );
}
