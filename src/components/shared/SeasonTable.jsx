// src/components/shared/SeasonTable.jsx
import React from "react";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function SeasonTable({ allMembers, seasonTotals, highlightName }) {
  const members = Object.keys(allMembers);

  if (!members.length) {
    return (
      <div className="empty-state">
        <div className="es-icon">🏆</div>
        <p className="muted">No season data yet.</p>
      </div>
    );
  }

  const rows = members
    .map((name) => {
      const sd = seasonTotals[name] || { total: 0, matches: [] };
      return {
        name,
        teamName: allMembers[name]?.teamName || name,
        total: sd.total || 0,
        matches: sd.matches || [],
      };
    })
    .sort((a, b) => b.total - a.total);

  const matchCount = rows[0]?.matches.length || 0;

  return (
    <>
      <div className="season-header">
        <div className="sh-title">Season Leaderboard</div>
        <div className="sh-sub">
          {matchCount} match{matchCount !== 1 ? "es" : ""} played
        </div>
      </div>

      <div className="season-cards">
        {rows.map((r, i) => (
          <div
            key={r.name}
            className={`sc-card ${r.name === highlightName ? "sc-me" : ""} ${
              i === 0 ? "sc-first" : ""
            }`}
          >
            <div className="sc-rank">{MEDALS[i] || "#" + (i + 1)}</div>
            <div className="sc-body">
              <div className="sc-name">
                {r.name}
                {r.name === highlightName && <span className="you">YOU</span>}
              </div>
              <div className="sc-tname">{r.teamName}</div>
              <div className="sc-history">
                {r.matches.length ? (
                  r.matches.map((m) => (
                    <span key={m.matchId} className="sc-mpill" title={m.label}>
                      {m.pts}pts
                    </span>
                  ))
                ) : (
                  <span className="muted-s">No matches yet</span>
                )}
              </div>
            </div>
            <div className="sc-total">
              {r.total}
              <span>total pts</span>
            </div>
          </div>
        ))}
      </div>

      {rows.length > 0 && rows[0].matches.length > 0 && (
        <div className="history-section">
          <div className="hs-title">Match-by-Match Breakdown</div>
          <div className="table-wrap">
            <table className="hist-table">
              <thead>
                <tr>
                  <th>Player</th>
                  {rows[0].matches.map((m) => (
                    <th key={m.matchId}>
                      {m.label.split("–")[0].trim().substring(0, 8)}
                    </th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.name}
                    className={r.name === highlightName ? "tr-me" : ""}
                  >
                    <td className="td-name">{r.name}</td>
                    {r.matches.map((m) => (
                      <td key={m.matchId} className="td-pts">
                        {m.pts}
                      </td>
                    ))}
                    <td className="td-total">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
