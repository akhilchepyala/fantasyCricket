// src/utils/cricketApi.js

const IPL_TEAMS = [
  "Mumbai Indians",
  "Chennai Super Kings",
  "Royal Challengers",
  "Kolkata Knight",
  "Delhi Capitals",
  "Rajasthan Royals",
  "Sunrisers Hyderabad",
  "Punjab Kings",
  "Lucknow Super Giants",
  "Gujarat Titans",
  "MI",
  "CSK",
  "RCB",
  "KKR",
  "DC",
  "RR",
  "SRH",
  "PBKS",
  "LSG",
  "GT",
];

export function isIPLName(name) {
  return (
    (name || "").toLowerCase().includes("ipl") ||
    IPL_TEAMS.some((t) => (name || "").toLowerCase().includes(t.toLowerCase()))
  );
}

function mapRole(roleStr) {
  const r = (roleStr || "").toLowerCase();
  if (r.includes("wicket") || r === "wk") return "WK";
  if (r.includes("allrounder") || r.includes("all-rounder") || r === "ar")
    return "AR";
  if (r.includes("bowl")) return "BOWL";
  return "BAT";
}

// Known IPL series IDs — used as fallback when currentMatches has no IPL entries
const IPL_SERIES_IDS = [
  "87c62aac-bc3c-4738-ab93-19da0690488f", // IPL 2026
  "d5a498c8-7596-4b93-8ab0-e0efc3345312", // IPL 2025
];

/**
 * Fetches current/upcoming matches from CricAPI.
 * Step 1: currentMatches (live + recently ended)
 * Step 2: series_info for each series found → adds upcoming fixtures
 * @param {string} apiKey
 * @param {boolean} isIPL
 * @returns {Promise<Array>} sorted array: live → upcoming → ended
 */
export async function fetchCurrentMatches(apiKey, isIPL) {
  // Step 1 — currentMatches (live + recently ended)
  const r1 = await fetch(
    `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`,
  );
  const d1 = await r1.json();
  if (d1.status !== "success")
    throw new Error(d1.reason || "API error — check your key");

  const current = d1.data || [];

  // Step 2 — collect series IDs to fetch upcoming fixtures from
  let seriesIds;
  if (isIPL) {
    // IPL: always use known series IDs directly
    seriesIds = IPL_SERIES_IDS;
  } else {
    // International: start with series IDs from currentMatches
    const fromCurrent = [
      ...new Set(
        current
          .filter((m) => !isIPLName(m.name))
          .map((m) => m.series_id)
          .filter(Boolean),
      ),
    ];

    // Also fetch the /series list to discover upcoming series not yet in currentMatches
    // (e.g. NZ vs SA that hasn't started yet)
    let fromSeriesList = [];
    try {
      const r2 = await fetch(
        `https://api.cricapi.com/v1/series?apikey=${apiKey}&offset=0`,
      );
      const d2 = await r2.json();
      if (d2.status === "success") {
        fromSeriesList = (d2.data || [])
          .filter((s) => !isIPLName(s.name))
          .map((s) => s.id)
          .filter(Boolean);
      }
    } catch (_) {
      // non-fatal — fall back to currentMatches series only
    }

    // Merge, dedupe, cap at 8 series (each costs 1 credit)
    seriesIds = [...new Set([...fromCurrent, ...fromSeriesList])].slice(0, 8);
  }

  // Step 3 — fetch series_info for each series to get full match lists
  const seriesResults = await Promise.allSettled(
    seriesIds.map((sid) =>
      fetch(
        `https://api.cricapi.com/v1/series_info?apikey=${apiKey}&id=${sid}`,
      ).then((r) => r.json()),
    ),
  );

  // Merge: currentMatches first, then upcoming fixtures from series_info
  const seen = new Set();
  const allMatches = [];

  current.forEach((m) => {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      allMatches.push(m);
    }
  });

  seriesResults.forEach((r) => {
    if (r.status === "fulfilled" && r.value.status === "success") {
      (r.value.data?.matchList || []).forEach((m) => {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          allMatches.push(m);
        }
      });
    }
  });

  // Filter by match type
  const filtered = allMatches.filter((m) =>
    isIPL ? isIPLName(m.name) : !isIPLName(m.name),
  );

  // Sort: live first → upcoming soonest → ended most recent
  filtered.sort((a, b) => {
    const rank = (m) =>
      m.matchStarted && !m.matchEnded ? 0 : !m.matchStarted ? 1 : 2;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    const da = new Date(a.dateTimeGMT || 0);
    const db = new Date(b.dateTimeGMT || 0);
    return rank(a) === 1 ? da - db : db - da;
  });

  return filtered;
}

/**
 * Fetches squad players for a given match from CricAPI.
 * @param {string} apiKey
 * @param {string} matchId
 * @returns {Promise<Array>} array of { name, team, role }
 */
export async function fetchSquadPlayers(apiKey, matchId) {
  const res = await fetch(
    `https://api.cricapi.com/v1/match_squad?apikey=${apiKey}&id=${matchId}`,
  );
  const data = await res.json();
  if (data.status !== "success")
    throw new Error(data.reason || "Squad unavailable");

  const seen = new Set();
  const players = [];
  (data.data || []).forEach((team) => {
    const teamName = team.shortname || team.teamName || "";
    (team.players || []).forEach((p) => {
      if (!p.name || seen.has(p.name)) return;
      seen.add(p.name);
      players.push({ name: p.name, team: teamName, role: mapRole(p.role) });
    });
  });

  if (players.length < 5)
    throw new Error("Not enough players returned from squad API");
  return players;
}

/**
 * Fetches scorecard stats and maps them to our player pool.
 * @param {string} apiKey
 * @param {string} liveMatchId
 * @param {Array} matchPlayers
 * @returns {Promise<Object>} updated stats map
 */
export async function fetchScorecard(apiKey, liveMatchId, matchPlayers) {
  const res = await fetch(
    `https://api.cricapi.com/v1/match_scorecard?apikey=${apiKey}&id=${liveMatchId}`,
  );
  const data = await res.json();
  if (data.status !== "success")
    throw new Error(data.reason || "Scorecard unavailable");

  const nameMap = {};
  matchPlayers.forEach((p) => {
    nameMap[p.name.toLowerCase()] = p.name;
  });

  const updatedStats = {};
  let updated = 0;
  const sc = data.data?.scorecard || [];

  sc.forEach((inn) => {
    (inn.batting || []).forEach((b) => {
      const raw = (b.batsman?.name || b.name || "").toLowerCase();
      const matched = Object.keys(nameMap).find(
        (k) => k.includes(raw) || raw.includes(k),
      );
      if (!matched) return;
      const key = nameMap[matched];
      updatedStats[key] = {
        ...(updatedStats[key] || {}),
        runs: b.r || 0,
        balls: b.b || 0,
        fours: b["4s"] || 0,
        sixes: b["6s"] || 0,
        batted: true,
        playingXI: true,
      };
      updated++;
    });

    (inn.bowling || []).forEach((bw) => {
      const raw = (bw.bowler?.name || bw.name || "").toLowerCase();
      const matched = Object.keys(nameMap).find(
        (k) => k.includes(raw) || raw.includes(k),
      );
      if (!matched) return;
      const key = nameMap[matched];
      updatedStats[key] = {
        ...(updatedStats[key] || {}),
        wickets: bw.w || 0,
        overs: parseFloat(bw.ov) || 0,
        runsConceded: bw.r || 0,
        maidens: bw.m || 0,
        playingXI: true,
      };
      updated++;
    });
  });

  return { updatedStats, updatedCount: updated };
}
