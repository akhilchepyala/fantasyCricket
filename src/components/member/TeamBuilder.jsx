// src/components/member/TeamBuilder.jsx
import React, { useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import PlayerGrid from "./PlayerGrid";
import XIPanel from "./XIPanel";
import { ROLE_LIMITS, MAX_PER_TEAM, MAX_OVERSEAS, BUDGET } from "../../constants/rules";
import {
  getCredits,
  isOverseas,
  teamSpend,
  overseasCount,
  teamCounts,
  roleCounts,
  validateTeam,
} from "../../utils/team";

export default function TeamBuilder({
  db,
  currentMatchId,
  localTeam,
  setLocalTeam,
  pool,
  isIPL,
  submitted,
  showToast,
}) {
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [search, setSearch]         = useState("");

  const sel      = localTeam.players;
  const spent    = teamSpend(sel);
  const fgnCnt   = overseasCount(sel);

  // ── Filter pool ──
  const filtered = pool.filter((p) => {
    const matchesRole   = roleFilter === "ALL" || p.role === roleFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // ── Toggle player ──
  function togglePlayer(p) {
    if (sel.includes(p.name)) {
      // Deselect
      setLocalTeam((t) => ({
        ...t,
        players: t.players.filter((x) => x !== p.name),
        captain: t.captain === p.name ? "" : t.captain,
        vc:      t.vc === p.name ? "" : t.vc,
      }));
    } else {
      // Validate before adding
      if (sel.length >= 11) { showToast("Already have 11 players", "err"); return; }
      const counts = teamCounts(sel, pool);
      if ((counts[p.team] || 0) >= MAX_PER_TEAM) {
        showToast(`Max ${MAX_PER_TEAM} players from ${p.team}`, "err"); return;
      }
      if (isIPL && isOverseas(p.name) && fgnCnt >= MAX_OVERSEAS) {
        showToast(`Max ${MAX_OVERSEAS} foreign players in XI`, "err"); return;
      }
      const rc = roleCounts(sel, pool);
      if (p.role && ROLE_LIMITS[p.role] && rc[p.role] >= ROLE_LIMITS[p.role].max) {
        showToast(`Max ${ROLE_LIMITS[p.role].max} ${p.role} players allowed`, "err"); return;
      }
      if (spent + getCredits(p.name) > BUDGET) {
        showToast(`Not enough credits — would go over ${BUDGET}CR`, "err"); return;
      }

      setLocalTeam((t) => {
        const newPlayers = [...t.players, p.name];
        const newCap = t.captain || p.name;
        const newVc  = !t.vc && p.name !== newCap ? p.name : t.vc;
        return { ...t, players: newPlayers, captain: newCap, vc: newVc };
      });
    }
  }

  // ── Remove from XI ──
  function removePlayer(name) {
    setLocalTeam((t) => ({
      ...t,
      players: t.players.filter((x) => x !== name),
      captain: t.captain === name ? "" : t.captain,
      vc:      t.vc === name ? "" : t.vc,
    }));
  }

  // ── Lock team ──
  async function lockTeam() {
    const err = validateTeam(localTeam, pool, isIPL);
    if (err) { showToast(err, "err"); return; }

    try {
      const matchRef  = doc(db, "matches", currentMatchId);
      const matchSnap = await getDoc(matchRef);
      const teams     = (matchSnap.data()?.teams) || {};
      teams[localTeam._memberName || ""] = {
        ...localTeam,
        submitted: true,
        updatedAt: Date.now(),
      };
      await updateDoc(matchRef, { teams });
      showToast("Team locked! 🔒");
    } catch (e) {
      showToast("Error: " + e.message, "err");
    }
  }

  return (
    <div className="builder">
      {/* Header */}
      <div className="bh">
        <div className="bh-top">
          <h2>
            Pick Your XI <span className="ctr">{sel.length}/11</span>
          </h2>
          {/* Budget bar */}
          <div className="budget-bar-wrap">
            <div className="budget-label">
              <span>CREDITS</span>
              <span className={`budget-num ${BUDGET - spent < 10 ? "budget-low" : ""}`}>
                {BUDGET - spent} left
              </span>
            </div>
            <div className="budget-bar">
              <div
                className={`budget-fill ${spent / BUDGET > 0.9 ? "budget-fill-warn" : ""}`}
                style={{ width: `${Math.min(100, (spent / BUDGET) * 100)}%` }}
              />
            </div>
            <div className="budget-footer">
              <span className="budget-spent">
                {spent} / {BUDGET} used
              </span>
              {isIPL ? (
                <span className={`ovs-counter ${fgnCnt >= MAX_OVERSEAS ? "ovs-full" : ""}`}>
                  ✈ {fgnCnt}/{MAX_OVERSEAS} foreign
                </span>
              ) : (
                <span className="ovs-counter">🌍 International</span>
              )}
            </div>
          </div>
        </div>
        <p>
          100 CR budget ·{isIPL ? " Max 4 foreign · " : " "}Role limits apply · C=2× VC=1.5×
        </p>
      </div>

      {/* Two-column layout */}
      <div className="builder-layout">
        {/* LEFT: Player grid */}
        <div className="builder-grid-col">
          <div className="filter-bar">
            <input
              className="sinp"
              style={{ margin: 0 }}
              placeholder="🔍 Search player or team…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="rtabs">
              {["ALL", "BAT", "BOWL", "AR", "WK"].map((r) => (
                <button
                  key={r}
                  className={`rtab ${roleFilter === r ? "active" : ""}`}
                  onClick={() => setRoleFilter(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="pgrid">
            {filtered.length === 0 ? (
              <div className="empty-hint">No players match</div>
            ) : (
              <PlayerGrid
                selected={sel}
                pool={filtered}
                isIPL={isIPL}
                onToggle={togglePlayer}
              />
            )}
          </div>
        </div>

        {/* RIGHT: XI panel */}
        <div className="builder-xi-col">
          <XIPanel
            selected={sel}
            captain={localTeam.captain}
            vc={localTeam.vc}
            pool={pool}
            onRemove={removePlayer}
            onChangeCaptain={(val) =>
              setLocalTeam((t) => ({
                ...t,
                captain: val,
                vc: t.vc === val ? "" : t.vc,
              }))
            }
            onChangeVC={(val) =>
              setLocalTeam((t) => ({
                ...t,
                vc: val,
                captain: t.captain === val ? "" : t.captain,
              }))
            }
            onLock={lockTeam}
            submitted={submitted}
          />
        </div>
      </div>
    </div>
  );
}
