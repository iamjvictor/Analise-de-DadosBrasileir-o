import type { Match, StandingRow, Team } from '../../domain/types.js';

/** Standings built solely from FINISHED matches. Unknown team IDs are ignored safely. */
export function calculateStandings(teams: readonly Team[], matches: readonly Match[]): StandingRow[] {
  const rows = new Map(teams.map((team) => [team.id, {
    team, position: 0, played: 0, wins: 0, draws: 0, losses: 0,
    goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
  }]));
  for (const match of matches) {
    if (match.status !== 'FINISHED' || match.homeGoals === null || match.awayGoals === null) continue;
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) continue;
    home.played++; away.played++;
    home.goalsFor += match.homeGoals; home.goalsAgainst += match.awayGoals;
    away.goalsFor += match.awayGoals; away.goalsAgainst += match.homeGoals;
    if (match.homeGoals > match.awayGoals) { home.wins++; home.points += 3; away.losses++; }
    else if (match.homeGoals < match.awayGoals) { away.wins++; away.points += 3; home.losses++; }
    else { home.draws++; away.draws++; home.points++; away.points++; }
  }
  const result = [...rows.values()];
  result.forEach((row) => { row.goalDifference = row.goalsFor - row.goalsAgainst; });
  const finished = matches.filter((m) => m.status === 'FINISHED' && m.homeGoals !== null && m.awayGoals !== null);
  result.sort((a, b) => {
    const general = b.points - a.points || b.wins - a.wins || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor;
    if (general) return general;
    // The league's head-to-head criterion is only meaningful for an exact two-team tie.
    const tied = result.filter((r) => r.points === a.points && r.wins === a.wins && r.goalDifference === a.goalDifference && r.goalsFor === a.goalsFor);
    if (tied.length === 2) {
      const [x, y] = tied;
      const h2h = finished.filter((m) => (m.homeTeamId === x.team.id && m.awayTeamId === y.team.id) || (m.homeTeamId === y.team.id && m.awayTeamId === x.team.id));
      const stats = new Map([[x.team.id, { points: 0, gd: 0, gf: 0 }], [y.team.id, { points: 0, gd: 0, gf: 0 }]]);
      for (const m of h2h) {
        const hg = m.homeGoals!; const ag = m.awayGoals!;
        const hs = stats.get(m.homeTeamId)!; const as = stats.get(m.awayTeamId)!;
        hs.gf += hg; hs.gd += hg - ag; as.gf += ag; as.gd += ag - hg;
        if (hg > ag) hs.points += 3; else if (hg < ag) as.points += 3; else { hs.points++; as.points++; }
      }
      const xs = stats.get(a.team.id)!; const ys = stats.get(b.team.id)!;
      const direct = ys.points - xs.points || ys.gd - xs.gd || ys.gf - xs.gf;
      if (direct) return direct;
    }
    return a.team.id.localeCompare(b.team.id);
  });
  result.forEach((row, i) => { row.position = i + 1; });
  return result;
}
