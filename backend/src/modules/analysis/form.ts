import type { Match, Team } from '../../domain/types.js';

export type FormResult = 'W' | 'D' | 'L';
export interface RecentForm {
  team: Team;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  pointsPerGame: number;
  goalsFor: number;
  goalsAgainst: number;
  sequence: FormResult[];
}

export interface RecentPerformance {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  pointsPerGame: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsForPerMatch: number;
  goalsAgainstPerMatch: number;
  goalDifferencePerMatch: number;
}

export interface RecentPerformanceOptions {
  before: string | null;
  limit: number;
  venue: 'any' | 'home' | 'away';
}

/** Recent scored performance, optionally cut strictly before a fixture and filtered by venue. */
export function getRecentPerformance(
  team: Team,
  matches: readonly Match[],
  options: RecentPerformanceOptions,
): RecentPerformance {
  const limit = Math.max(0, Math.floor(options.limit));
  const played = matches
    .filter((match) => {
      if (match.status !== 'FINISHED' || match.homeGoals === null || match.awayGoals === null) return false;
      const isHome = match.homeTeamId === team.id;
      const isAway = match.awayTeamId === team.id;
      if (!isHome && !isAway) return false;
      if (options.venue === 'home' && !isHome) return false;
      if (options.venue === 'away' && !isAway) return false;
      if (options.before !== null && (!match.utcDate || match.utcDate >= options.before)) return false;
      return true;
    })
    .sort((a, b) => String(b.utcDate ?? '').localeCompare(String(a.utcDate ?? '')) || b.id.localeCompare(a.id))
    .slice(0, limit);

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let points = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const match of played) {
    const home = match.homeTeamId === team.id;
    const gf = home ? match.homeGoals! : match.awayGoals!;
    const ga = home ? match.awayGoals! : match.homeGoals!;
    goalsFor += gf;
    goalsAgainst += ga;
    if (gf > ga) { wins++; points += 3; }
    else if (gf === ga) { draws++; points++; }
    else losses++;
  }

  const count = played.length;
  return {
    matches: count, wins, draws, losses, points,
    pointsPerGame: count ? points / count : 0,
    goalsFor, goalsAgainst,
    goalsForPerMatch: count ? goalsFor / count : 0,
    goalsAgainstPerMatch: count ? goalsAgainst / count : 0,
    goalDifferencePerMatch: count ? (goalsFor - goalsAgainst) / count : 0,
  };
}

/** Most recent first; only completed, scored matches participate. */
export function getRecentForm(team: Team, matches: readonly Match[], limit = 10): RecentForm {
  const played = matches.filter((m) => m.status === 'FINISHED' && m.homeGoals !== null && m.awayGoals !== null && (m.homeTeamId === team.id || m.awayTeamId === team.id))
    .sort((a, b) => String(b.utcDate ?? '').localeCompare(String(a.utcDate ?? '')) || b.id.localeCompare(a.id)).slice(0, Math.max(0, limit));
  let wins = 0; let draws = 0; let losses = 0; let points = 0; let goalsFor = 0; let goalsAgainst = 0;
  const sequence = played.map((m): FormResult => {
    const home = m.homeTeamId === team.id;
    const gf = home ? m.homeGoals! : m.awayGoals!; const ga = home ? m.awayGoals! : m.homeGoals!;
    goalsFor += gf; goalsAgainst += ga;
    if (gf > ga) { wins++; points += 3; return 'W'; }
    if (gf === ga) { draws++; points++; return 'D'; }
    losses++; return 'L';
  });
  return { team, matches: played.length, wins, draws, losses, points, pointsPerGame: played.length ? points / played.length : 0, goalsFor, goalsAgainst, sequence };
}
