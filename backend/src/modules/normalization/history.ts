import type { Match, Team } from '../../domain/types.js';
import type { RawMatch, RawMatchesResponse } from '../raw-data/index.js';

export interface NormalizedHistory {
  teams: Team[];
  matches: Match[];
  finishedMatches: Match[];
  excludedStatuses: Partial<Record<'POSTPONED' | 'IN_PLAY', number>>;
}

const validStatuses = new Set<Match['status']>([
  'FINISHED', 'SCHEDULED', 'TIMED', 'POSTPONED', 'IN_PLAY', 'SUSPENDED', 'CANCELLED',
]);

function mapStatus(status: string): Match['status'] {
  if (!validStatuses.has(status as Match['status'])) {
    throw new Error(`Unsupported football-data match status: ${status}`);
  }
  return status as Match['status'];
}

function asScore(score: number | null | undefined): number | null {
  return Number.isInteger(score) ? score as number : null;
}

function asTeam(raw: RawMatch['homeTeam']): Team {
  return {
    id: String(raw.id),
    name: raw.name,
    shortName: raw.shortName,
    crestUrl: raw.crest ?? null,
  };
}

export function normalizeHistory(archives: Map<number, RawMatchesResponse | { matches: RawMatch[] }>): NormalizedHistory {
  const teamsById = new Map<string, Team>();
  const matches: Match[] = [];
  const excludedStatuses: NormalizedHistory['excludedStatuses'] = {};

  for (const [seasonYear, archive] of [...archives.entries()].sort(([left], [right]) => left - right)) {
    for (const raw of archive.matches) {
      const home = asTeam(raw.homeTeam);
      const away = asTeam(raw.awayTeam);
      teamsById.set(home.id, home);
      teamsById.set(away.id, away);

      const status = mapStatus(raw.status);
      if (status === 'POSTPONED') excludedStatuses.POSTPONED = (excludedStatuses.POSTPONED ?? 0) + 1;
      if (status === 'IN_PLAY') excludedStatuses.IN_PLAY = (excludedStatuses.IN_PLAY ?? 0) + 1;
      matches.push({
        id: String(raw.id),
        season: seasonYear,
        utcDate: raw.utcDate,
        status,
        matchday: Number.isInteger(raw.matchday) ? raw.matchday : null,
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeGoals: asScore(raw.score?.fullTime?.home),
        awayGoals: asScore(raw.score?.fullTime?.away),
      });
    }
  }

  return {
    teams: [...teamsById.values()].sort((left, right) => left.id.localeCompare(right.id)),
    matches,
    finishedMatches: matches.filter(match => match.status === 'FINISHED'),
    excludedStatuses,
  };
}
