// src/components/admin/PlayerStats.jsx
import React, { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { calcPoints } from "../../utils/points";
import { ROLE_ICONS } from "../../constants/rules";

const NUM_FIELDS = [
  ["runs",         "Runs"],
  ["balls",        "Balls"],
  ["fours",        "4s"],
  ["sixes",        "6s"],
  ["wickets",      "Wkts"],
  ["overs",        "Ovrs"],
  ["runsConceded", "RC"],
  ["catches",      "Ctch"],
  ["stumpings",    "St"],
  ["lbwBowled",    "LBW"],
];

export default function PlayerStats({
  db,
  currentMatchId,
  currentMatch,
  matchPlayers,
  arActive,
  arSecs,
  onToggleAR,
  autoFetchStats,
  showToast,
}) {
  const [search, setSearch]       = useState("");
  const [localStats, setLocalStats] = useState({});
  const [saving, setSaving]       = useState({});
  const [arSel, setArSel]         = useState(300);

  useEffect(() => {
    setLocalStats(currentMatch.stats || {});
  }, [currentMatch.stats]);

  if (!currentMatchId) {
    return (
      <div className="empty-state">
        <div className="es-icon">📊</div>
        <p className="muted">Create a match first.</p>
      </div>
    );
  }

  const filtered = matchPlayers.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.toLowerCase().includes(search.toLowerCase())
  );

  function updateStat(player, field, value) {
    setLocalStats((s) => ({
      ...s,
      [player]: { ...(s[player] || {}), [field]: value },
    }));
  }

  async function saveStats(playerName) {
    setSaving((s) => ({ ...s, [playerName]: true }));
    try {
      await updateDoc(doc(db, "matches", currentMatchId), {
        [`stats.${playerName}`]: localStats[playerName] || {},
      });
      showToast("✓ Saved");
    } catch (e) {
      showToast("Error: " + e.message, "err");
    }
    setSaving((s) => ({ ...s, [playerName]: false }));
  }

  async function fetchNow() {
    const { count, error } = await autoFetchStats(true);
    if (error) showToast("Error: " + error, "err");
    else if (count > 0) showToast(`✓ Stats updated for ${count} entries`);
    else showToast("No matching stats in scorecard yet", "err");
  }

  return (
    <div style={{ padding: 16 }}>
      <div className="acard">
        <div className="acard-hrow">
          <div className="acard-t">
            📊 Player Stats — {currentMatch.label || "Current Match"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button className="btn-sm" onClick={fetchNow}>
              ⚡ Fetch Now
            </button>
            <div className="ar-wrap">
              <span className="ar-lbl">Auto every</span>
              <select
                className="ar-sel"
                value={arSel}
                onChange={(e) => setArSel(Number(e.target.value))}
              >
                <option value={0}>Off</option>
                <option value={120}>2 min</option>
                <option value={300}>5 min</option>
                <option value={600}>10 min</option>
              </select>
              <button
                className={`ar-btn ${arActive ? "ar-on" : "ar-off"}`}
                onClick={() => onToggleAR(arSel)}
              >
                {arActive ? "🟢 ON" : "⏸ OFF"}
              </button>
              {arActive && (
                <span className="ar-cd">next in {arSecs}s</span>
              )}
            </div>
          </div>
        </div>

        <p className="muted" style={{ marginBottom: 10 }}>
          Stats update the leaderboard live for everyone.
        </p>

        <input
          className="sinp"
          placeholder="🔍 Search player…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {!filtered.length ? (
          <div className="muted" style={{ padding: "20px", textAlign: "center" }}>
            {matchPlayers.length
              ? "No players match"
              : "Load players first in the Current Match tab"}
          </div>
        ) : (
          <div className="stats-grid">
            {filtered.map((p) => {
              const s   = localStats[p.name] || {};
              const pts = calcPoints(s);
              return (
                <div key={p.name} className="stat-card">
                  <div className="sc-hd">
                    <div>
                      <div className="sc-nm">{p.name}</div>
                      <div className="sc-tm">
                        {ROLE_ICONS[p.role] || ""} {p.team}
                      </div>
                    </div>
                    <div className={`sc-pts ${pts > 0 ? "sc-pts-on" : ""}`}>
                      {pts > 0 ? pts + " pts" : "–"}
                    </div>
                  </div>

                  <div className="sc-inp">
                    {NUM_FIELDS.map(([field, label]) => (
                      <div key={field} className="si-g">
                        <label>{label}</label>
                        <input
                          type="number"
                          className="si"
                          min="0"
                          step={field === "overs" ? "0.1" : "1"}
                          value={s[field] || 0}
                          onChange={(e) =>
                            updateStat(p.name, field, parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="sc-chk">
                    <label>
                      <input
                        type="checkbox"
                        checked={!!s.playingXI}
                        onChange={(e) =>
                          updateStat(p.name, "playingXI", e.target.checked)
                        }
                      />{" "}
                      Playing XI
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!s.batted}
                        onChange={(e) =>
                          updateStat(p.name, "batted", e.target.checked)
                        }
                      />{" "}
                      Batted
                    </label>
                  </div>

                  <button
                    className="btn-save"
                    disabled={saving[p.name]}
                    onClick={() => saveStats(p.name)}
                  >
                    {saving[p.name] ? "Saving…" : "Save"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
