import type { Match, StandingRow } from '../../domain/types.js';

/** Re-rank rows after a run using competition points, wins, GD, goals and two-team H2H. */
export function rankSeason(rows: readonly StandingRow[], results: readonly Match[]): StandingRow[] {
  const ranked = rows.map((r) => ({ ...r }));
  const directMatches = results.filter((m) => m.status === 'FINISHED' && m.homeGoals !== null && m.awayGoals !== null);
  ranked.sort((a, b) => {
    const initial = b.points - a.points || b.wins - a.wins || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor;
    if (initial) return initial;
    const tied = ranked.filter((r) => r.points === a.points && r.wins === a.wins && r.goalDifference === a.goalDifference && r.goalsFor === a.goalsFor);
    if (tied.length === 2) {
      const [x, y] = tied;
      const stat = new Map([[x.team.id, { points: 0, gd: 0, gf: 0 }], [y.team.id, { points: 0, gd: 0, gf: 0 }]]);
      for (const m of directMatches) {
        if (!stat.has(m.homeTeamId) || !stat.has(m.awayTeamId)) continue;
        const h = stat.get(m.homeTeamId)!; const aw = stat.get(m.awayTeamId)!;
        h.gf += m.homeGoals!; h.gd += m.homeGoals! - m.awayGoals!; aw.gf += m.awayGoals!; aw.gd += m.awayGoals! - m.homeGoals!;
        if (m.homeGoals! > m.awayGoals!) h.points += 3; else if (m.homeGoals! < m.awayGoals!) aw.points += 3; else { h.points++; aw.points++; }
      }
      const sx = stat.get(a.team.id)!; const sy = stat.get(b.team.id)!;
      const direct = sy.points - sx.points || sy.gd - sx.gd || sy.gf - sx.gf;
      if (direct) return direct;
    }
    return a.team.id.localeCompare(b.team.id);
  });
  ranked.forEach((r, i) => { r.position = i + 1; });
  return ranked;
}
