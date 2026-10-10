import type { Match, Team } from '../../domain/types.js';
import { getRecentForm, getRecentPerformance } from '../analysis/form.js';
import { getVenueHeadToHead } from '../analysis/headToHead.js';
import type { RecentForm } from '../analysis/form.js';
import { isParityFixture, PREDICTION_CONFIG } from './config.js';
import { makeScoreDistribution, type ScoreDistribution } from './poisson.js';

export const MODEL_PARAMETERS = Object.freeze({
  ...PREDICTION_CONFIG,
  legacyRecentFormWeight: 0.25,
});

export interface MatchPrediction extends ScoreDistribution { fixtureId: string; }
export type PredictionVariant = 'baseline' | 'full' | 'without-h2h' | 'without-parity';
export interface PredictionWeights {
  recent10Weight: number;
  recent5FormWeight: number;
  venue5Weight: number;
  headToHeadWeight: number;
  parityWeight: number;
}
export interface PredictionOptions {
  variant?: PredictionVariant;
  weights?: Partial<PredictionWeights>;
}

const DEFAULT_WEIGHTS: PredictionWeights = {
  recent10Weight: PREDICTION_CONFIG.recent10Weight,
  recent5FormWeight: PREDICTION_CONFIG.recent5FormWeight,
  venue5Weight: PREDICTION_CONFIG.venue5Weight,
  headToHeadWeight: PREDICTION_CONFIG.headToHeadWeight,
  parityWeight: PREDICTION_CONFIG.parityWeight,
};

function clampLambda(value: number): number {
  return Math.min(PREDICTION_CONFIG.lambdaMax, Math.max(PREDICTION_CONFIG.lambdaMin, value));
}

function priorAverage(total: number, count: number, baseline: number): number {
  return (total + PREDICTION_CONFIG.smoothingMatches * baseline) / (count + PREDICTION_CONFIG.smoothingMatches);
}

function ratioFactor(observed: number, baseline: number, weight: number): number {
  if (weight === 0 || baseline <= 0 || observed <= 0) return 1;
  return Math.pow(Math.max(0.25, Math.min(4, observed / baseline)), weight);
}

function outcome(fixture: Match, lambdaHome: number, lambdaAway: number): MatchPrediction {
  return { fixtureId: fixture.id, ...makeScoreDistribution(clampLambda(lambdaHome), clampLambda(lambdaAway)) };
}

function predictV01(
  fixture: Match,
  teams: readonly Team[],
  usable: readonly Match[],
  recentForm: ReadonlyMap<string, RecentForm>,
  ratings: ReadonlyMap<string, number>,
): MatchPrediction {
  const homeAverage = (usable.reduce((sum, match) => sum + match.homeGoals!, 0) + 3 * 1.35) / (usable.length + 3);
  const awayAverage = (usable.reduce((sum, match) => sum + match.awayGoals!, 0) + 3 * 1.05) / (usable.length + 3);
  const aggregate = (teamId: string, home: boolean, scored: boolean) => {
    const relevant = usable.filter((match) => (home ? match.homeTeamId === teamId : match.awayTeamId === teamId));
    const goals = relevant.reduce((sum, match) => sum + (scored ? (home ? match.homeGoals! : match.awayGoals!) : (home ? match.awayGoals! : match.homeGoals!)), 0);
    const base = scored ? (home ? homeAverage : awayAverage) : (home ? awayAverage : homeAverage);
    return (goals + 3 * base) / (relevant.length + 3);
  };
  const attackHome = aggregate(fixture.homeTeamId, true, true) / homeAverage;
  const concedeAway = aggregate(fixture.awayTeamId, false, false) / homeAverage;
  const attackAway = aggregate(fixture.awayTeamId, false, true) / awayAverage;
  const concedeHome = aggregate(fixture.homeTeamId, true, false) / awayAverage;
  const formFactor = (teamId: string, venue: 'home' | 'away') => {
    const form = recentForm.get(teamId);
    if (!form || !form.matches) return 1;
    const perMatch = form.goalsFor / form.matches;
    const baseline = venue === 'home' ? homeAverage : awayAverage;
    return Math.max(0.5, Math.min(1.5, 1 + 0.25 * (perMatch / baseline - 1)));
  };
  const homeElo = ratings.get(fixture.homeTeamId) ?? 1500;
  const awayElo = ratings.get(fixture.awayTeamId) ?? 1500;
  const eloFactor = 10 ** ((homeElo + 60 - awayElo) / 1600);
  return outcome(
    fixture,
    homeAverage * attackHome * concedeAway * formFactor(fixture.homeTeamId, 'home') * eloFactor,
    awayAverage * attackAway * concedeHome * formFactor(fixture.awayTeamId, 'away') / eloFactor,
  );
}

/** Season strength plus recent attack/defence, form, venue, head-to-head and Elo features. */
export function predictFixture(
  fixture: Match,
  teams: readonly Team[],
  finishedMatches: readonly Match[],
  recentForm: ReadonlyMap<string, RecentForm> = new Map(),
  ratings: ReadonlyMap<string, number> = new Map(),
  historicalMatches: readonly Match[] = [],
  options: PredictionOptions = {},
): MatchPrediction {
  const teamIds = new Set(teams.map((team) => team.id));
  const before = fixture.utcDate;
  const isBeforeFixture = (match: Match) => before !== null && match.utcDate !== null && match.utcDate < before;
  const usable = finishedMatches.filter((match) => match.status === 'FINISHED'
    && match.homeGoals !== null && match.awayGoals !== null
    && teamIds.has(match.homeTeamId) && teamIds.has(match.awayTeamId)
    && isBeforeFixture(match));
  const variant = options.variant ?? 'full';
  if (variant === 'baseline') return predictV01(fixture, teams, usable, before === null ? new Map() : recentForm, before === null ? new Map() : ratings);

  const weights = { ...DEFAULT_WEIGHTS, ...options.weights };
  const homeAverage = (usable.reduce((sum, match) => sum + match.homeGoals!, 0) + 3 * 1.35) / (usable.length + 3);
  const awayAverage = (usable.reduce((sum, match) => sum + match.awayGoals!, 0) + 3 * 1.05) / (usable.length + 3);
  const aggregate = (teamId: string, home: boolean, scored: boolean) => {
    const relevant = usable.filter((match) => (home ? match.homeTeamId === teamId : match.awayTeamId === teamId));
    const goals = relevant.reduce((sum, match) => sum + (scored ? (home ? match.homeGoals! : match.awayGoals!) : (home ? match.awayGoals! : match.homeGoals!)), 0);
    const baseline = scored ? (home ? homeAverage : awayAverage) : (home ? awayAverage : homeAverage);
    return priorAverage(goals, relevant.length, baseline);
  };
  let lambdaHome = homeAverage
    * (aggregate(fixture.homeTeamId, true, true) / homeAverage)
    * (aggregate(fixture.awayTeamId, false, false) / homeAverage);
  let lambdaAway = awayAverage
    * (aggregate(fixture.awayTeamId, false, true) / awayAverage)
    * (aggregate(fixture.homeTeamId, true, false) / awayAverage);

  const overallRates = (teamId: string) => {
    const relevant = usable.filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId);
    const gf = relevant.reduce((sum, match) => sum + (match.homeTeamId === teamId ? match.homeGoals! : match.awayGoals!), 0);
    const ga = relevant.reduce((sum, match) => sum + (match.homeTeamId === teamId ? match.awayGoals! : match.homeGoals!), 0);
    const leagueAverage = (homeAverage + awayAverage) / 2;
    return {
      attack: priorAverage(gf, relevant.length, leagueAverage),
      defence: priorAverage(ga, relevant.length, leagueAverage),
    };
  };
  const homeSeason = overallRates(fixture.homeTeamId);
  const awaySeason = overallRates(fixture.awayTeamId);
  const home10 = getRecentPerformance(teams.find((team) => team.id === fixture.homeTeamId)!, usable, { before: null, limit: 10, venue: 'any' });
  const away10 = getRecentPerformance(teams.find((team) => team.id === fixture.awayTeamId)!, usable, { before: null, limit: 10, venue: 'any' });
  lambdaHome *= ratioFactor(priorAverage(home10.goalsFor, home10.matches, homeSeason.attack), homeSeason.attack, weights.recent10Weight);
  lambdaHome *= ratioFactor(priorAverage(away10.goalsAgainst, away10.matches, awaySeason.defence), awaySeason.defence, weights.recent10Weight);
  lambdaAway *= ratioFactor(priorAverage(away10.goalsFor, away10.matches, awaySeason.attack), awaySeason.attack, weights.recent10Weight);
  lambdaAway *= ratioFactor(priorAverage(home10.goalsAgainst, home10.matches, homeSeason.defence), homeSeason.defence, weights.recent10Weight);

  const homeTeam = teams.find((team) => team.id === fixture.homeTeamId)!;
  const awayTeam = teams.find((team) => team.id === fixture.awayTeamId)!;
  const home5 = getRecentPerformance(homeTeam, usable, { before: null, limit: 5, venue: 'any' });
  const away5 = getRecentPerformance(awayTeam, usable, { before: null, limit: 5, venue: 'any' });
  const formFactor = (points: number, count: number) => {
    const smoothedPointsPerGame = (points + PREDICTION_CONFIG.smoothingMatches * 1.5) / (count + PREDICTION_CONFIG.smoothingMatches);
    return ratioFactor(smoothedPointsPerGame, 1.5, weights.recent5FormWeight);
  };
  const homeForm = formFactor(home5.points, home5.matches);
  const awayForm = formFactor(away5.points, away5.matches);
  lambdaHome *= homeForm / awayForm;
  lambdaAway *= awayForm / homeForm;

  const homeVenue5 = getRecentPerformance(homeTeam, usable, { before: null, limit: 5, venue: 'home' });
  const awayVenue5 = getRecentPerformance(awayTeam, usable, { before: null, limit: 5, venue: 'away' });
  const homeAttackVenue = priorAverage(homeVenue5.goalsFor, homeVenue5.matches, homeAverage);
  const homeDefenceVenue = priorAverage(homeVenue5.goalsAgainst, homeVenue5.matches, awayAverage);
  const awayAttackVenue = priorAverage(awayVenue5.goalsFor, awayVenue5.matches, awayAverage);
  const awayDefenceVenue = priorAverage(awayVenue5.goalsAgainst, awayVenue5.matches, homeAverage);
  lambdaHome *= ratioFactor(homeAttackVenue, homeAverage, weights.venue5Weight);
  lambdaHome *= ratioFactor(awayDefenceVenue, homeAverage, weights.venue5Weight);
  lambdaAway *= ratioFactor(awayAttackVenue, awayAverage, weights.venue5Weight);
  lambdaAway *= ratioFactor(homeDefenceVenue, awayAverage, weights.venue5Weight);

  const history = [...usable, ...historicalMatches];
  const h2h = before === null
    ? { matches: 0, homeGoalsPerMatch: 0, awayGoalsPerMatch: 0, homePointsPerMatch: 0, awayPointsPerMatch: 0 }
    : getVenueHeadToHead(fixture.homeTeamId, fixture.awayTeamId, history, before);
  const h2hWeight = variant === 'without-h2h' ? 0 : weights.headToHeadWeight * h2h.matches / PREDICTION_CONFIG.headToHeadWindow;
  lambdaHome *= ratioFactor(Math.max(0.25, h2h.homeGoalsPerMatch), homeAverage, h2hWeight);
  lambdaAway *= ratioFactor(Math.max(0.25, h2h.awayGoalsPerMatch), awayAverage, h2hWeight);

  const homeElo = ratings.get(fixture.homeTeamId) ?? 1500;
  const awayElo = ratings.get(fixture.awayTeamId) ?? 1500;
  const eloFactor = 10 ** ((homeElo + 60 - awayElo) / PREDICTION_CONFIG.eloScale);
  lambdaHome *= eloFactor;
  lambdaAway /= eloFactor;

  if (variant !== 'without-parity' && isParityFixture(fixture.homeTeamId, fixture.awayTeamId) && weights.parityWeight > 0) {
    const weight = Math.min(0.5, Math.max(0, weights.parityWeight));
    const geometricMean = Math.sqrt(lambdaHome * lambdaAway);
    lambdaHome = lambdaHome ** (1 - weight) * geometricMean ** weight;
    lambdaAway = lambdaAway ** (1 - weight) * geometricMean ** weight;
  }
  return outcome(fixture, lambdaHome, lambdaAway);
}
