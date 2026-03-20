// src/components/member/PlayerGrid.jsx
import React from "react";
import { ROLE_ICONS, ROLE_LIMITS, MAX_PER_TEAM, MAX_OVERSEAS } from "../../constants/rules";
import {
  getCredits,
  isOverseas,
  teamSpend,
  overseasCount,
  teamCounts,
  roleCounts,
  getCreditTierClass,
} from "../../utils/team";

export default function PlayerGrid({ selected, pool, isIPL, onToggle }) {
  const counts    = teamCounts(selected, pool);
  const remaining = 100 - teamSpend(selected);
  const fgnCnt    = overseasCount(selected);
  const rc        = roleCounts(selected, pool);

  if (!pool.length) {
    return (
      <div className="empty-hint" style={{ gridColumn: "1/-1" }}>
        No players in pool yet.
      </div>
    );
  }

  return (
    <>
      {pool.map((p) => {
        const sel        = selected.includes(p.name);
        const cr         = getCredits(p.name);
        const isFgn      = isOverseas(p.name);
        const teamFull   = !sel && (counts[p.team] || 0) >= MAX_PER_TEAM;
        const xiFull     = !sel && selected.length >= 11;
        const overBudget = !sel && cr > remaining;
        const fgnFull    = !sel && isFgn && isIPL && fgnCnt >= MAX_OVERSEAS;
        const roleFull   =
          !sel &&
          p.role &&
          ROLE_LIMITS[p.role] &&
          rc[p.role] >= ROLE_LIMITS[p.role].max;
        const disabled   = teamFull || xiFull || overBudget || fgnFull || roleFull;

        const title = teamFull
          ? `Max ${MAX_PER_TEAM} from ${p.team}`
          : fgnFull
          ? `Max ${MAX_OVERSEAS} foreign players`
          : roleFull
          ? `Max ${ROLE_LIMITS[p.role]?.max} ${p.role} players`
          : overBudget
          ? `Not enough credits (${remaining} left)`
          : "";

        return (
          <div
            key={p.name}
            className={`pcard ${sel ? "pcard-on" : ""} ${disabled ? "pcard-dis" : ""}`}
            onClick={() => !disabled && onToggle(p)}
            title={title}
          >
            {sel && <div className="pchk">✓</div>}
            {teamFull && <div className="team-cap-badge">MAX</div>}
            {fgnFull && !teamFull && !xiFull && (
              <div className="team-cap-badge" style={{ background: "#2563eb" }}>
                4/4
              </div>
            )}
            {overBudget && !xiFull && !teamFull && !fgnFull && (
              <div className="team-cap-badge" style={{ background: "var(--muted)" }}>
                💸
              </div>
            )}

            <div className="pc-role">
              {ROLE_ICONS[p.role] || ""} {p.role}
            </div>
            <div className="pc-name">{p.name}</div>
            {isFgn && <div className="pc-overseas-tag">FOREIGN</div>}
            <div className="pc-footer">
              <span className="pc-team">
                {p.team}
                {counts[p.team] && !sel ? (
                  <span className="team-cnt">
                    {counts[p.team]}/{MAX_PER_TEAM}
                  </span>
                ) : null}
              </span>
              <span className={`pc-cr ${getCreditTierClass(cr)}`}>{cr} CR</span>
            </div>
          </div>
        );
      })}
    </>
  );
}
