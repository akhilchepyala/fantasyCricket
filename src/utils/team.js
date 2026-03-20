// src/utils/team.js
import { PLAYER_CREDITS, OVERSEAS_PLAYERS } from "../constants/players";
import { MAX_PER_TEAM, MAX_OVERSEAS, BUDGET, ROLE_LIMITS } from "../constants/rules";

export function getCredits(name) {
  return PLAYER_CREDITS[name] || 7;
}

export function isOverseas(name) {
  return OVERSEAS_PLAYERS.has(name);
}

export function teamSpend(players) {
  return players.reduce((acc, name) => acc + getCredits(name), 0);
}

export function overseasCount(players) {
  return players.filter(isOverseas).length;
}

export function teamCounts(players, pool) {
  const counts = {};
  players.forEach((name) => {
    const p = pool.find((x) => x.name === name);
    if (p) counts[p.team] = (counts[p.team] || 0) + 1;
  });
  return counts;
}

export function roleCounts(players, pool) {
  const counts = { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
  players.forEach((name) => {
    const p = pool.find((x) => x.name === name);
    if (p && counts[p.role] !== undefined) counts[p.role]++;
  });
  return counts;
}

export function getCreditTierClass(cr) {
  if (cr >= 11) return "cr-elite";
  if (cr >= 10) return "cr-premium";
  if (cr >= 9)  return "cr-standard";
  if (cr >= 8)  return "cr-stdB";
  return "cr-budget";
}

/**
 * Validates the team and returns an error string or null.
 */
export function validateTeam(team, pool, isIPL) {
  const { players, captain, vc } = team;
  if (players.length !== 11) return "Select exactly 11 players";
  if (!captain) return "Pick a Captain";
  if (!vc || vc === captain) return "Pick a different Vice-Captain";

  const tc = teamCounts(players, pool);
  const breached = Object.entries(tc).find(([, c]) => c > MAX_PER_TEAM);
  if (breached) return `Too many players from ${breached[0]} (max ${MAX_PER_TEAM})`;

  if (isIPL && overseasCount(players) > MAX_OVERSEAS)
    return `Max ${MAX_OVERSEAS} foreign players allowed`;

  const rc = roleCounts(players, pool);
  for (const [role, limits] of Object.entries(ROLE_LIMITS)) {
    if (rc[role] < limits.min)
      return `Need at least ${limits.min} ${role} player${limits.min > 1 ? "s" : ""}`;
    if (rc[role] > limits.max)
      return `Max ${limits.max} ${role} players allowed`;
  }

  if (teamSpend(players) > BUDGET)
    return `Over budget! ${teamSpend(players)}/${BUDGET} credits used`;

  return null;
}

export function lastName(name) {
  return name.split(" ").pop();
}
