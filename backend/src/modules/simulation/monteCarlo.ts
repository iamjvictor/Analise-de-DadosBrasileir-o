import type { Match, StandingRow } from '../../domain/types.js';
import type { MatchPrediction } from '../prediction/predict.js';
import { sampleScore } from '../prediction/poisson.js';
import { rankSeason } from './ranking.js';

export interface SimulationOptions { runs: number; seed: number; finishedMatches?: readonly Match[] }
export interface TeamSimulation { teamId: string; titleProbability: number; top4Probability: number; expectedPoints: number; averagePosition: number }
export interface SimulationSummary { simulations: number; simulatedMatches: number; teams: TeamSimulation[] }

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Monte Carlo over eligible scheduled fixtures only. Inputs are never mutated. */
export function simulateSeason(
  currentStandings: readonly StandingRow[],
  pendingFixtures: readonly Match[],
  predictions: ReadonlyMap<string, MatchPrediction>,
  options: SimulationOptions,
): SimulationSummary {
  if (!Number.isInteger(options.runs) || options.runs < 1) throw new RangeError('runs must be a positive integer');
  const fixtures = pendingFixtures.filter((m) => (m.status === 'SCHEDULED' || m.status === 'TIMED') && predictions.has(m.id));
  const random = seededRandom(options.seed);
  const counts = new Map(currentStandings.map((r) => [r.team.id, { title: 0, top4: 0, points: 0, position: 0 }]));
  for (let n = 0; n < options.runs; n++) {
    const rows = currentStandings.map((r) => ({ ...r }));
    const byId = new Map(rows.map((r) => [r.team.id, r]));
    const outcomes: Match[] = [];
    for (const fixture of fixtures) {
      const dist = predictions.get(fixture.id)!;
      const score = sampleScore(dist, random);
      const home = byId.get(fixture.homeTeamId); const away = byId.get(fixture.awayTeamId);
      if (!home || !away) continue;
      home.played++; away.played++;
      home.goalsFor += score.homeGoals; home.goalsAgainst += score.awayGoals;
      away.goalsFor += score.awayGoals; away.goalsAgainst += score.homeGoals;
      if (score.homeGoals > score.awayGoals) { home.wins++; home.points += 3; away.losses++; }
      else if (score.homeGoals < score.awayGoals) { away.wins++; away.points += 3; home.losses++; }
      else { home.draws++; away.draws++; home.points++; away.points++; }
      home.goalDifference = home.goalsFor - home.goalsAgainst; away.goalDifference = away.goalsFor - away.goalsAgainst;
      outcomes.push({ ...fixture, status: 'FINISHED', homeGoals: score.homeGoals, awayGoals: score.awayGoals });
    }
    const ranked = rankSeason(rows, [...(options.finishedMatches ?? []), ...outcomes]);
    ranked.forEach((r, i) => {
      const agg = counts.get(r.team.id); if (!agg) return;
      if (i === 0) agg.title++;
      if (i < 4) agg.top4++;
      agg.points += r.points; agg.position += i + 1;
    });
  }
  const teams = [...counts].map(([teamId, c]) => ({ teamId, titleProbability: c.title / options.runs, top4Probability: c.top4 / options.runs, expectedPoints: c.points / options.runs, averagePosition: c.position / options.runs }));
  return { simulations: options.runs, simulatedMatches: fixtures.length, teams };
}
