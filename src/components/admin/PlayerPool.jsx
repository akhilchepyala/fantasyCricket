// src/components/admin/PlayerPool.jsx
import React, { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import {
  fetchCurrentMatches,
  fetchSquadPlayers,
  searchSeriesMatches,
} from "../../utils/cricketApi";

export default function PlayerPool({
  db,
  currentMatchId,
  currentMatch,
  matchPlayers,
  metaGame,
  onPickMyTeam,
  showToast,
}) {
  const [cricKey, setCricKey] = useState(metaGame.cricApiKey || "");
  const [liveMatchId, setLiveMatchId] = useState(
    currentMatch.liveMatchId || "",
  );
  const [matchesList, setMatchesList] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualTeam, setManualTeam] = useState("");
  const [manualRole, setManualRole] = useState("BAT");

  const [seriesQuery, setSeriesQuery] = useState("");
  const [fetchingS, setFetchingS] = useState(false);

  useEffect(() => {
    setCricKey(metaGame.cricApiKey || "");
  }, [metaGame.cricApiKey]);

  useEffect(() => {
    setLiveMatchId(currentMatch.liveMatchId || "");
  }, [currentMatch.liveMatchId]);

  async function saveLiveMatchId() {
    if (!currentMatchId) {
      showToast("Create a match first", "err");
      return;
    }
    await updateDoc(doc(db, "matches", currentMatchId), {
      liveMatchId: liveMatchId.trim(),
    });
    showToast("Match ID saved ✓");
  }

  const isIPL = currentMatch.isIPL !== false;

  // ── Save API key ──
  async function saveApiKey() {
    await updateDoc(doc(db, "meta", "game"), { cricApiKey: cricKey });
    showToast("API key saved");
  }

  // ── Fetch matches list from CricAPI ──
  async function fetchMatches() {
    const key = cricKey || metaGame.cricApiKey;
    if (!key) {
      showToast("Enter API key first", "err");
      return;
    }
    setFetching(true);
    try {
      const matches = await fetchCurrentMatches(key, isIPL);
      setMatchesList(matches);
    } catch (e) {
      showToast(e.message, "err");
    }
    setFetching(false);
  }

  // ── Search series by name and show their matches ──
  async function fetchSeriesMatches() {
    const key = cricKey || metaGame.cricApiKey;
    if (!key) {
      showToast("Enter API key first", "err");
      return;
    }
    if (!seriesQuery.trim()) {
      showToast("Enter a series name to search", "err");
      return;
    }
    setFetchingS(true);
    try {
      const { matches, seriesNames } = await searchSeriesMatches(
        key,
        seriesQuery.trim(),
      );
      setMatchesList(matches);
      showToast(
        `Found ${matches.length} matches from: ${seriesNames.join(", ")}`,
      );
    } catch (e) {
      showToast(e.message, "err");
    }
    setFetchingS(false);
  }

  // ── Group matches by status (mirrors HTML version logic) ──
  function groupMatches(matches) {
    const live = matches.filter((m) => m.matchStarted && !m.matchEnded);
    const ended = matches.filter((m) => m.matchEnded);
    const upcoming = matches.filter((m) => !m.matchStarted && !m.matchEnded);
    return { live, upcoming, ended };
  }
  // ── Format date (append Z so browser parses as UTC, matching HTML version) ──
  function formatDate(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
      const tzShort =
        new Intl.DateTimeFormat("en", { timeZoneName: "short" })
          .formatToParts(d)
          .find((p) => p.type === "timeZoneName")?.value || "";
      const date = d.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const time = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${date}, ${time} ${tzShort}`;
    } catch {
      return dateStr;
    }
  }

  // ── Select a match from the list → save liveMatchId + auto-fetch squad ──
  async function selectMatch(m) {
    if (!currentMatchId) {
      showToast("Create a match first", "err");
      return;
    }
    if (currentMatch.finalized) {
      showToast("Match is finalized", "err");
      return;
    }

    // Save the match ID, clear old players, reset match state, and update label from API data
    await updateDoc(doc(db, "matches", currentMatchId), {
      liveMatchId: m.id,
      players: [],
      teams: {},
      stats: {},
      revealed: false,
      locked: false,
      label: m.name || currentMatch.label,
      t1: (m.teams && m.teams[0]) || currentMatch.t1 || "",
      t2: (m.teams && m.teams[1]) || currentMatch.t2 || "",
    });
    setLiveMatchId(m.id);
    setMatchesList([]);

    // Auto-fetch squad if available
    if (m.hasSquad === false) {
      showToast("Match selected. No squad yet — add players manually.");
      return;
    }

    const key = cricKey || metaGame.cricApiKey;
    showToast("Match selected! Loading players…");
    try {
      const players = await fetchSquadPlayers(key, m.id);
      await updateDoc(doc(db, "matches", currentMatchId), { players });
      showToast(`✓ ${players.length} players loaded from squad`);
    } catch (e) {
      showToast(`Match saved. Squad unavailable: ${e.message}`, "err");
    }
  }

  // ── Add player manually ──
  async function addPlayerManually() {
    if (!manualName.trim()) {
      showToast("Enter a player name", "err");
      return;
    }
    if (!manualTeam.trim()) {
      showToast("Enter team name", "err");
      return;
    }
    if (!currentMatchId) {
      showToast("Create a match first", "err");
      return;
    }
    if (
      matchPlayers.find(
        (p) => p.name.toLowerCase() === manualName.toLowerCase(),
      )
    ) {
      showToast(`${manualName} already in pool`, "err");
      return;
    }
    const updated = [
      ...matchPlayers,
      { name: manualName.trim(), team: manualTeam.trim(), role: manualRole },
    ];
    await updateDoc(doc(db, "matches", currentMatchId), { players: updated });
    setManualName("");
    setManualTeam("");
    showToast(`✓ ${manualName} added`);
  }

  // ── Change player role ──
  async function changeRole(playerName, newRole) {
    const updated = matchPlayers.map((p) =>
      p.name === playerName ? { ...p, role: newRole } : p,
    );
    await updateDoc(doc(db, "matches", currentMatchId), { players: updated });
    showToast(`✓ ${playerName} → ${newRole}`);
  }

  // ── Remove player ──
  async function removePlayer(playerName) {
    const updated = matchPlayers.filter((p) => p.name !== playerName);
    await updateDoc(doc(db, "matches", currentMatchId), { players: updated });
    showToast(`Removed ${playerName}`);
  }

  // ── Clear all ──
  async function clearPool() {
    if (!window.confirm("Remove all players from the pool?")) return;
    await updateDoc(doc(db, "matches", currentMatchId), { players: [] });
    showToast("Pool cleared");
  }

  return (
    <div className="acard">
      <div className="acard-t">🔑 CricketAPI &amp; Players</div>
      {currentMatch.label && (
        <div className="match-bar" style={{ margin: "0 0 12px" }}>
          <div>
            <div className="match-label-sm">CURRENT MATCH</div>
            <div className="match-title">{currentMatch.label}</div>
          </div>
        </div>
      )}

      {/* API key */}
      <div className="field">
        <label>
          CricketData.org API Key{" "}
          <a
            className="alink"
            href="https://cricketdata.org"
            target="_blank"
            rel="noreferrer"
          >
            get free →
          </a>
        </label>
        <input
          type="text"
          value={cricKey}
          onChange={(e) => setCricKey(e.target.value)}
          placeholder="Paste API key"
        />
      </div>

      <div className="field">
        <label>
          Live Match ID{" "}
          <span
            style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}
          >
            (auto-filled when you pick a match, or paste manually)
          </span>
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={liveMatchId}
            onChange={(e) => setLiveMatchId(e.target.value)}
            placeholder="e.g. abc123-def456"
            onKeyDown={(e) => e.key === "Enter" && saveLiveMatchId()}
          />
          <button
            className="btn-sm"
            onClick={saveLiveMatchId}
            style={{ flexShrink: 0 }}
          >
            Save
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn-sm" onClick={saveApiKey}>
          Save Key
        </button>
        <button className="btn-sm" onClick={fetchMatches} disabled={fetching}>
          {fetching
            ? "Fetching…"
            : isIPL
              ? "🏏 Find IPL Matches"
              : "🌍 Find International Matches"}
        </button>
      </div>

      {/* Series search — for matches not showing in auto-fetch */}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
          Can't find your match? Search by series name:
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            className="sinp"
            style={{ margin: 0, flex: 1, fontSize: 12 }}
            placeholder="e.g. New Zealand South Africa 2026"
            value={seriesQuery}
            onChange={(e) => setSeriesQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchSeriesMatches()}
          />
          <button
            className="btn-sm"
            onClick={fetchSeriesMatches}
            disabled={fetchingS}
            style={{ flexShrink: 0 }}
          >
            {fetchingS ? "…" : "Search Series"}
          </button>
        </div>
      </div>

      {/* Match list from API — grouped by status */}
      {matchesList.length > 0 &&
        (() => {
          const { live, upcoming, ended } = groupMatches(matchesList);
          const Section = ({ icon, label, items, labelClass }) =>
            items.length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <div className={`match-section-hdr ${labelClass}`}>
                  {icon} {label}
                </div>
                {items.map((m) => (
                  <div
                    key={m.id}
                    className="match-item"
                    onClick={() => selectMatch(m)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mi-name">{m.name}</div>
                      <div className="mi-status">
                        {formatDate(m.dateTimeGMT)}
                      </div>
                      {!m.matchStarted && m.hasSquad === false && (
                        <div className="mi-warn">
                          ⚠ Squad not announced yet — you can still select and
                          add players manually
                        </div>
                      )}
                    </div>
                    <button className="mi-btn">Select</button>
                  </div>
                ))}
              </div>
            ) : null;
          return (
            <>
              <Section
                icon="🔴"
                label="LIVE NOW"
                items={live}
                labelClass="msh-live"
              />
              <Section
                icon="🕐"
                label="UPCOMING"
                items={upcoming}
                labelClass="msh-upcoming"
              />
              <Section
                icon="✓"
                label="RECENTLY ENDED"
                items={ended}
                labelClass="msh-ended"
              />
            </>
          );
        })()}

      {/* Player pool */}
      <div style={{ marginTop: 16 }}>
        <div className="acard-hrow" style={{ marginBottom: 10 }}>
          <div className="acard-t" style={{ fontSize: 13, marginBottom: 0 }}>
            👥 Player Pool{" "}
            {matchPlayers.length > 0 && (
              <span
                style={{ color: "var(--text2)", fontSize: 12, fontWeight: 400 }}
              >
                ({matchPlayers.length} loaded)
              </span>
            )}
          </div>
        </div>

        {matchPlayers.length > 0 ? (
          <div className="pool-chips" style={{ marginBottom: 12 }}>
            {matchPlayers.map((p) => (
              <span key={p.name} className="pool-chip">
                {p.name} <em>{p.team}</em>
                <select
                  className="pool-role-sel"
                  value={p.role}
                  onChange={(e) => changeRole(p.name, e.target.value)}
                >
                  {["BAT", "BOWL", "AR", "WK"].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  className="pool-remove-btn"
                  onClick={() => removePlayer(p.name)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ marginBottom: 10, fontSize: 12 }}>
            No players loaded yet. Use API fetch above or add manually below.
          </p>
        )}

        {/* Manual add */}
        <div className="manual-add-player">
          <div className="map-row">
            <input
              className="sinp"
              style={{ margin: 0, flex: 2 }}
              placeholder="Player name e.g. Finn Allen"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayerManually()}
            />
            <input
              className="sinp team-inp"
              style={{ margin: 0, flex: 1 }}
              placeholder="Team e.g. NZ"
              value={manualTeam}
              onChange={(e) => setManualTeam(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayerManually()}
            />
            <select
              className="map-role-sel"
              value={manualRole}
              onChange={(e) => setManualRole(e.target.value)}
            >
              {["BAT", "BOWL", "AR", "WK"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              className="btn-sm"
              onClick={addPlayerManually}
              style={{ whiteSpace: "nowrap", flexShrink: 0 }}
            >
              + Add
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              marginTop: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              className="btn-sm"
              style={{ color: "var(--red)", borderColor: "rgba(255,68,68,.3)" }}
              onClick={clearPool}
            >
              Clear All
            </button>
            <p className="muted" style={{ fontSize: 11, margin: 0 }}>
              Add each player one by one or use API fetch above
            </p>
          </div>
        </div>
      </div>

      {/* Pick My Team shortcut — only when match is still open */}
      {matchPlayers.length > 0 &&
        onPickMyTeam &&
        metaGame.adminProfile?.name &&
        !currentMatch.finalized &&
        !currentMatch.locked && (
          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: "1px solid var(--bd)",
            }}
          >
            <button
              className="btn-reveal"
              style={{ width: "100%", fontSize: 15 }}
              onClick={onPickMyTeam}
            >
              🏏 Pick My Team for This Match
            </button>
            <p
              className="muted"
              style={{ fontSize: 11, marginTop: 6, textAlign: "center" }}
            >
              Playing as {metaGame.adminProfile.name}
            </p>
          </div>
        )}
    </div>
  );
}
