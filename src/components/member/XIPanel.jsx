// src/components/member/XIPanel.jsx
import React from "react";
import { ROLE_ICONS, ROLE_LIMITS, BUDGET } from "../../constants/rules";
import { getCredits, teamSpend, roleCounts, lastName } from "../../utils/team";

export default function XIPanel({
  selected,
  captain,
  vc,
  pool,
  onRemove,
  onChangeCaptain,
  onChangeVC,
  onLock,
  submitted,
  hideLock,
}) {
  const spent = teamSpend(selected);
  const rc = roleCounts(selected, pool);

  return (
    <div className="xi-sticky">
      {/* Header */}
      <div className="xi-panel-hd">
        <div className="xi-title">YOUR XI</div>
        <div
          style={{
            display: "flex",
            gap: 5,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div className="role-summary">
            {Object.entries(ROLE_LIMITS).map(([r, l]) => (
              <span
                key={r}
                className={`rs-pill ${
                  rc[r] > l.max || (rc[r] < l.min && selected.length === 11)
                    ? "rs-err"
                    : rc[r] === l.max
                      ? "rs-full"
                      : ""
                }`}
              >
                {r} {rc[r]}
              </span>
            ))}
          </div>
          <div
            className={`xi-budget-badge ${spent > BUDGET ? "xi-budget-over" : ""}`}
          >
            {spent}/{BUDGET}CR
          </div>
        </div>
      </div>

      {/* Player list */}
      <div className="xi-list">
        {selected.length === 0 ? (
          <div className="xi-empty">Tap players to add them →</div>
        ) : (
          selected.map((p, i) => {
            const pObj = pool.find((x) => x.name === p) || {
              role: "BAT",
              team: "",
            };
            const isC = p === captain;
            const isV = p === vc;
            return (
              <div
                key={p}
                className={`xi-row ${isC ? "xi-row-c" : isV ? "xi-row-v" : ""}`}
              >
                <span className="xi-num">{i + 1}</span>
                <div className="xi-row-info">
                  <div className="xi-row-name">
                    {p}
                    {isC && <span className="xi-badge-c">C</span>}
                    {isV && <span className="xi-badge-v">VC</span>}
                  </div>
                  <div className="xi-row-meta">
                    {ROLE_ICONS[pObj.role] || ""} {pObj.role} · {pObj.team} ·{" "}
                    <span style={{ color: "var(--gold)" }}>
                      {getCredits(p)}CR
                    </span>
                  </div>
                </div>
                <button className="xi-remove" onClick={() => onRemove(p)}>
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Captain / VC selectors */}
      {selected.length > 0 && (
        <div className="cap-grid" style={{ marginTop: 10 }}>
          <div className="cs">
            <label>Captain (2×)</label>
            <select
              value={captain}
              onChange={(e) => onChangeCaptain(e.target.value)}
            >
              {selected.map((p) => (
                <option key={p} value={p}>
                  {lastName(p)}
                </option>
              ))}
            </select>
          </div>
          <div className="cs">
            <label>Vice-Captain (1.5×)</label>
            <select value={vc} onChange={(e) => onChangeVC(e.target.value)}>
              {selected.map((p) => (
                <option key={p} value={p}>
                  {lastName(p)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Lock button */}
      {!hideLock &&
        (selected.length === 11 ? (
          <button
            className="btn-lock"
            style={{ marginTop: 10 }}
            onClick={onLock}
          >
            {submitted ? "🔄 UPDATE MY TEAM" : "🔒 LOCK IN MY TEAM"}
          </button>
        ) : (
          <div className="need-more" style={{ marginTop: 10 }}>
            Need {11 - selected.length} more player
            {11 - selected.length !== 1 ? "s" : ""}
          </div>
        ))}
    </div>
  );
}
