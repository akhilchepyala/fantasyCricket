// src/components/admin/MatchControl.jsx
import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { memberMatchTotal } from "../../utils/points";

export default function MatchControl({
  db,
  currentMatchId,
  currentMatch,
  matchPlayers,
  allTeams,
  allMembers,
  playerStats,
  showToast,
}) {
  const [matchLabel, setMatchLabel] = useState(currentMatch.label || "");
  const [t1, setT1]                 = useState(currentMatch.t1    || "");
  const [t2, setT2]                 = useState(currentMatch.t2    || "");
  const [matchIsIPL, setMatchIsIPL] = useState(currentMatch.isIPL !== false);

  useEffect(() => {
    setMatchLabel(currentMatch.label || "");
    setT1(currentMatch.t1    || "");
    setT2(currentMatch.t2    || "");
    setMatchIsIPL(currentMatch.isIPL !== false);
  }, [currentMatch]);

  const locked    = currentMatch.locked   || currentMatch.revealed || currentMatch.finalized;
  const revealed  = currentMatch.revealed || currentMatch.finalized;
  const finalized = currentMatch.finalized;
  const members   = Object.keys(allMembers);
  const subs      = members.filter((n) => (allTeams[n] || {}).submitted).length;
  const ranked    = members
    .map((n) => ({
      name:      n,
      total:     memberMatchTotal(allTeams[n] || {}, playerStats),
      submitted: !!(allTeams[n] || {}).submitted,
    }))
    .sort((a, b) => b.total - a.total);

  // ── Create / update match ──
  async function createOrUpdateMatch() {
    if (!matchLabel.trim()) { showToast("Enter a match label", "err"); return; }
    if (currentMatchId && !currentMatch.finalized) {
      await updateDoc(doc(db, "matches", currentMatchId), {
        label: matchLabel.trim(), t1, t2, isIPL: matchIsIPL,
      });
      showToast("Match updated ✓");
    } else {
      const mid = "match_" + Date.now();
      const snap = await getDocs(collection(db, "matches"));
      const matchNum = snap.size + 1;
      await setDoc(doc(db, "matches", mid), {
        label: matchLabel.trim(), t1, t2, matchNum, isIPL: matchIsIPL,
        revealed: false, locked: false, finalized: false,
        players: [], stats: {}, teams: {}, liveMatchId: "",
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "meta", "game"), { currentMatchId: mid });
      showToast(`Match created! (${matchIsIPL ? "IPL" : "International"}) Now load players.`);
    }
  }

  // ── Reveal ──
  async function revealTeams() {
    if (!window.confirm("Reveal all teams now? Everyone will see each other's picks immediately.")) return;
    await updateDoc(doc(db, "matches", currentMatchId), { revealed: true });
    showToast("Teams revealed! 🥁");
  }

  // ── Lock ──
  async function lockTeams() {
    if (!window.confirm("Lock teams? No more edits — about 10 mins to first ball.")) return;
    await updateDoc(doc(db, "matches", currentMatchId), { locked: true });
    showToast("Teams locked 🔒");
  }

  // ── Finalize ──
  async function finalizeMatch() {
    if (!window.confirm("Finalize this match? Points will be saved to the season leaderboard.")) return;
    try {
      const stats = currentMatch.stats || {};
      const teams = currentMatch.teams || {};
      const stSnap = await getDoc(doc(db, "season", "totals"));
      const totals = stSnap.exists() ? stSnap.data() : {};
      members.forEach((name) => {
        const t   = teams[name] || {};
        const pts = memberMatchTotal(t, stats);
        if (!totals[name]) totals[name] = { total: 0, matches: [] };
        const already = totals[name].matches.some((m) => m.matchId === currentMatchId);
        if (!already) {
          totals[name].total   = (totals[name].total || 0) + pts;
          totals[name].matches = [
            ...(totals[name].matches || []),
            { matchId: currentMatchId, label: currentMatch.label || "Match", pts },
          ];
        }
      });
      await setDoc(doc(db, "season", "totals"), totals);
      await updateDoc(doc(db, "matches", currentMatchId), { finalized: true });
      showToast("Match finalized! Points saved ✅");
    } catch (e) {
      showToast("Error: " + e.message, "err");
    }
  }

  // ── Start new match ──
  async function startNewMatch() {
    if (!window.confirm("Start a new match? The current match stays in history.")) return;
    await updateDoc(doc(db, "meta", "game"), { currentMatchId: "" });
    showToast("Ready for next match!");
  }

  // ── Nuclear wipe ──
  async function nukeEverything() {
    const input = window.prompt(
      "This will delete:\n\n• All match data\n• All teams & picks\n• All stats\n• The entire season table\n\n✅ Member registrations will be KEPT.\n\nType RESET to confirm:"
    );
    if (input !== "RESET") { showToast("Cancelled — nothing was deleted"); return; }
    try {
      const matchSnap = await getDocs(collection(db, "matches"));
      for (const d of matchSnap.docs) {
        await setDoc(doc(db, "matches", d.id), {
          label: "", players: [], stats: {}, teams: {},
          revealed: false, locked: false, finalized: false, liveMatchId: "",
        });
      }
      await setDoc(doc(db, "season", "totals"), {});
      await updateDoc(doc(db, "meta", "game"), { currentMatchId: "", matchPlayers: [] });
      showToast("✓ Match data wiped. Member registrations kept!");
    } catch (e) {
      showToast("Error: " + e.message, "err");
    }
  }

  return (
    <div className="admin-2col">
      {/* LEFT column */}
      <div className="acol">

        {/* Match setup card */}
        <div className="acard">
          <div className="acard-t">🏏 Current Match</div>
          {currentMatchId && (
            <div className="match-bar" style={{ margin: "0 0 12px" }}>
              <div>
                <div className="match-label-sm">ACTIVE</div>
                <div className="match-title">{currentMatch.label || "–"}</div>
              </div>
              <span className={`pill ${locked ? "pill-red" : "pill-green"}`}>
                {finalized ? "✓ Final" : revealed ? "Revealed" : locked ? "Locked" : "Open"}
              </span>
            </div>
          )}

          <div className="field">
            <label>Match Label</label>
            <input
              type="text"
              value={matchLabel}
              onChange={(e) => setMatchLabel(e.target.value)}
              placeholder="e.g. MI vs CSK — Match 5"
            />
          </div>
          <div className="field">
            <label>Team 1</label>
            <input type="text" value={t1} onChange={(e) => setT1(e.target.value)} placeholder="Mumbai Indians" />
          </div>
          <div className="field">
            <label>Team 2</label>
            <input type="text" value={t2} onChange={(e) => setT2(e.target.value)} placeholder="Chennai Super Kings" />
          </div>

          <div className="match-type-toggle">
            <span className="mt-label">Match Type</span>
            <div className="mt-opts">
              <button
                className={`mt-btn ${matchIsIPL ? "mt-active" : ""}`}
                onClick={() => setMatchIsIPL(true)}
              >
                🏏 IPL
              </button>
              <button
                className={`mt-btn ${!matchIsIPL ? "mt-active" : ""}`}
                onClick={() => setMatchIsIPL(false)}
              >
                🌍 International
              </button>
            </div>
            <span className="mt-hint">
              {matchIsIPL
                ? "Max 4 foreign · role limits apply"
                : "No foreign player cap · all roles allowed"}
            </span>
          </div>

          <button
            className="btn-gold"
            style={{ fontSize: 15, padding: 10 }}
            onClick={createOrUpdateMatch}
          >
            {currentMatchId && !currentMatch.finalized ? "Update Match" : "+ Create New Match"}
          </button>
        </div>

        {/* Match control card */}
        <div className="acard">
          <div className="acard-t">🎮 Match Control</div>

          <div className="flow-steps">
            {[
              ["1 · Teams open",  !locked && !revealed && !finalized, revealed || locked || finalized],
              ["2 · Toss revealed", revealed && !locked && !finalized, locked || finalized],
              ["3 · Teams locked",  locked && !finalized,              finalized],
              ["4 · Finalized",     finalized,                         false],
            ].map(([label, isActive, isDone], idx) => (
              <React.Fragment key={idx}>
                <div
                  className={`fs ${isActive ? "fs-active" : isDone ? "fs-done" : "fs-dim"}`}
                >
                  {label}
                </div>
                {idx < 3 && <div className="fs-arrow">→</div>}
              </React.Fragment>
            ))}
          </div>

          <div className="srow"><span>Submissions</span>  <span className="pill pill-green">{subs}/{members.length}</span></div>
          <div className="srow"><span>Toss Revealed</span><span className={`pill ${revealed ? "pill-red" : "pill-green"}`}>{revealed ? "YES" : "NO"}</span></div>
          <div className="srow"><span>Teams Locked</span> <span className={`pill ${locked   ? "pill-red" : "pill-green"}`}>{locked   ? "YES" : "NO"}</span></div>
          <div className="srow"><span>Finalized</span>    <span className={`pill ${finalized ? "pill-red" : "pill-green"}`}>{finalized ? "YES" : "NO"}</span></div>

          <div className="ctrl-btns">
            {!revealed && currentMatchId && (
              <>
                <button className="btn-reveal" onClick={revealTeams}>
                  🥁 TOSS DONE — REVEAL TEAMS!
                </button>
                <p className="ctrl-hint">Hit this the moment toss happens. Everyone sees all teams.</p>
              </>
            )}
            {revealed && !locked && (
              <>
                <button className="btn-warn" onClick={lockTeams}>
                  🔒 Lock Teams (10 min before play)
                </button>
                <p className="ctrl-hint">No more edits after this. Hit it ~10 mins before first ball.</p>
              </>
            )}
            {locked && !finalized && (
              <button className="btn-warn" onClick={finalizeMatch}>
                ✅ Finalize &amp; Save to Season
              </button>
            )}
            {finalized && (
              <button
                className="btn-gold"
                style={{ fontSize: 15, padding: 10 }}
                onClick={startNewMatch}
              >
                + Start Next Match
              </button>
            )}
          </div>

          {/* Test wipe */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--bd)" }}>
            <div
              style={{
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13,
                fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase",
                color: "var(--muted)", marginBottom: 6,
              }}
            >
              🧪 Test Mode
            </div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Wipe everything — match, teams, stats, season table. Member registrations are kept.
            </p>
            <button className="btn-nuke" onClick={nukeEverything}>
              🗑️ Reset Everything (Test Wipe)
            </button>
          </div>
        </div>

        {/* Submissions card */}
        <div className="acard">
          <div className="acard-t">
            👥 Submissions ({subs}/{members.length})
          </div>
          {!members.length && <p className="muted">No members yet.</p>}
          {ranked.map((r, i) => (
            <div key={r.name} className="mrow">
              <span className="mrow-r">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "#" + (i + 1)}
              </span>
              <span className="mrow-n">{r.name}</span>
              <span className={`mrow-s ${r.submitted ? "s-yes" : "s-no"}`}>
                {r.submitted ? "✓" : "Pending"}
              </span>
              {revealed && <span className="mrow-p">{r.total}pts</span>}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT column — filled by parent (player pool + leaderboard) */}
      <div className="acol" id="match-right-col" />
    </div>
  );
}
