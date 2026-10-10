import type { Match, Team } from '../../domain/types.js';

export const ELO_PARAMETERS = Object.freeze({ initialRating: 1500, kFactor: 20, homeBonus: 60 });

/** Season-local Elo. Unknown/promoted IDs are skipped and never added implicitly. */
export function calculateSeasonElo(teams: readonly Team[], matches: readonly Match[]): Map<string, number> {
  const ratings = new Map<string, number>(teams.map((team) => [team.id, ELO_PARAMETERS.initialRating]));
  const chronological = matches.filter((m) => m.status === 'FINISHED' && m.homeGoals !== null && m.awayGoals !== null)
    .sort((a, b) => String(a.utcDate ?? '').localeCompare(String(b.utcDate ?? '')) || a.id.localeCompare(b.id));
  for (const match of chronological) {
    const home = ratings.get(match.homeTeamId); const away = ratings.get(match.awayTeamId);
    if (home === undefined || away === undefined) continue;
    const expectedHome = 1 / (1 + 10 ** ((away - (home + ELO_PARAMETERS.homeBonus)) / 400));
    const actualHome = match.homeGoals! > match.awayGoals! ? 1 : match.homeGoals === match.awayGoals ? 0.5 : 0;
    const change = ELO_PARAMETERS.kFactor * (actualHome - expectedHome);
    ratings.set(match.homeTeamId, home + change);
    ratings.set(match.awayTeamId, away - change);
  }
  return ratings;
}
