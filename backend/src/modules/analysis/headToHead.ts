import type { Match } from '../../domain/types.js';

export interface HeadToHeadSummary {
  matches: number;
  homeGoalsPerMatch: number;
  awayGoalsPerMatch: number;
  homePointsPerMatch: number;
  awayPointsPerMatch: number;
}

const EMPTY_SUMMARY: HeadToHeadSummary = Object.freeze({
  matches: 0,
  homeGoalsPerMatch: 0,
  awayGoalsPerMatch: 0,
  homePointsPerMatch: 0,
  awayPointsPerMatch: 0,
});

/** Summarize up to five previous head-to-heads with the same home/away roles. */
export function getVenueHeadToHead(
  homeTeamId: string,
  awayTeamId: string,
  matches: readonly Match[],
  before: string,
): HeadToHeadSummary {
  const relevant = matches
    .filter((match) => match.status === 'FINISHED'
      && match.homeGoals !== null && match.awayGoals !== null
      && match.utcDate !== null && match.utcDate < before
      && match.homeTeamId === homeTeamId && match.awayTeamId === awayTeamId)
    .sort((a, b) => String(b.utcDate).localeCompare(String(a.utcDate)) || b.id.localeCompare(a.id))
    .slice(0, 5);

  if (!relevant.length) return { ...EMPTY_SUMMARY };

  let weightTotal = 0;
  let homeGoals = 0;
  let awayGoals = 0;
  let homePoints = 0;
  let awayPoints = 0;
  relevant.forEach((match, index) => {
    const weight = 1 - index * 0.2;
    weightTotal += weight;
    homeGoals += match.homeGoals! * weight;
    awayGoals += match.awayGoals! * weight;
    if (match.homeGoals! > match.awayGoals!) homePoints += 3 * weight;
    else if (match.homeGoals! < match.awayGoals!) awayPoints += 3 * weight;
    else { homePoints += weight; awayPoints += weight; }
  });

  return {
    matches: relevant.length,
    homeGoalsPerMatch: homeGoals / weightTotal,
    awayGoalsPerMatch: awayGoals / weightTotal,
    homePointsPerMatch: homePoints / weightTotal,
    awayPointsPerMatch: awayPoints / weightTotal,
  };
}
