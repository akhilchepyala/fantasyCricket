// src/utils/points.js

/**
 * Calculates fantasy points for a player's match stats.
 * @param {Object} s - player stats object
 * @returns {number} total points
 */
export function calcPoints(s) {
  if (!s) return 0;
  let p = 0;
  const runs = s.runs || 0;
  const balls = s.balls || 0;
  const wkts = s.wickets || 0;
  const overs = s.overs || 0;

  // Batting
  p += runs + (s.fours || 0) + (s.sixes || 0) * 2;
  if (runs >= 100) p += 16;
  else if (runs >= 50) p += 8;
  else if (runs >= 30) p += 4;
  if (s.batted && runs === 0) p -= 2;

  // Strike rate (min 10 balls)
  if (balls >= 10) {
    const sr = (runs / balls) * 100;
    if (sr >= 170) p += 6;
    else if (sr >= 150) p += 4;
    else if (sr >= 130) p += 2;
    else if (sr < 50) p -= 6;
    else if (sr < 60) p -= 4;
    else if (sr < 70) p -= 2;
  }

  // Bowling
  p += wkts * 25 + (s.maidens || 0) * 8;
  if (wkts >= 5) p += 16;
  else if (wkts >= 4) p += 8;
  else if (wkts >= 3) p += 4;
  p += (s.lbwBowled || 0) * 8;

  // Economy rate (min 2 overs)
  if (overs >= 2) {
    const er = (s.runsConceded || 0) / overs;
    if (er < 5) p += 6;
    else if (er < 6) p += 4;
    else if (er < 7) p += 2;
    else if (er > 10) p -= 2;
    else if (er > 9) p -= 4;
    else if (er > 8) p -= 6;
  }

  // Fielding
  p += (s.catches || 0) * 8;
  if ((s.catches || 0) >= 3) p += 4;
  p += (s.runOutDirect || 0) * 12;
  p += (s.runOutIndirect || 0) * 6;
  p += (s.stumpings || 0) * 12;

  // Playing XI bonus
  if (s.playingXI) p += 4;

  return Math.round(p);
}

/**
 * Calculates total points for a fantasy team in a match.
 * @param {Object} team - { players, captain, vc }
 * @param {Object} stats - { playerName: statsObject }
 * @returns {number} total points (with captain/vc multipliers)
 */
export function memberMatchTotal(team, stats) {
  return Math.round(
    (team.players || []).reduce((acc, p) => {
      let pts = calcPoints(stats[p]);
      if (p === team.captain) pts *= 2;
      else if (p === team.vc) pts *= 1.5;
      return acc + pts;
    }, 0)
  );
}
