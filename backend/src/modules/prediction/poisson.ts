export interface ScoreProbability { homeGoals: number; awayGoals: number; probability: number }
export interface ScoreDistribution { lambdaHome: number; lambdaAway: number; scores: ScoreProbability[]; homeWin: number; draw: number; awayWin: number }

function poissonMass(lambda: number, max: number): number[] {
  const out = [Math.exp(-lambda)];
  for (let k = 1; k <= max; k++) out.push(out[k - 1] * lambda / k);
  return out;
}

/** Independent Poisson scores, extended until omitted joint mass is below tolerance. */
export function makeScoreDistribution(lambdaHome: number, lambdaAway: number, tolerance = 1e-10): ScoreDistribution {
  if (!(lambdaHome > 0 && lambdaAway > 0) || !Number.isFinite(lambdaHome + lambdaAway)) throw new RangeError('Expected goals must be finite and positive');
  let max = Math.max(12, Math.ceil(Math.max(lambdaHome, lambdaAway) + 10 * Math.sqrt(Math.max(lambdaHome, lambdaAway))));
  let hp: number[]; let ap: number[];
  do {
    hp = poissonMass(lambdaHome, max); ap = poissonMass(lambdaAway, max);
    const omitted = 1 - hp.reduce((x, y) => x + y, 0) * ap.reduce((x, y) => x + y, 0);
    if (omitted <= tolerance) break;
    max += 4;
  } while (max < 100);
  const scores: ScoreProbability[] = [];
  let total = 0; let homeWin = 0; let draw = 0; let awayWin = 0;
  for (let h = 0; h <= max; h++) for (let a = 0; a <= max; a++) {
    const probability = hp[h] * ap[a]; total += probability;
    if (h > a) homeWin += probability; else if (h === a) draw += probability; else awayWin += probability;
    scores.push({ homeGoals: h, awayGoals: a, probability });
  }
  for (const score of scores) score.probability /= total;
  return { lambdaHome, lambdaAway, scores, homeWin: homeWin / total, draw: draw / total, awayWin: awayWin / total };
}

/** Samples from the same normalized score distribution used for match probabilities. */
export function sampleScore(distribution: ScoreDistribution, random: () => number): ScoreProbability {
  const draw = random(); let cumulative = 0;
  for (const score of distribution.scores) { cumulative += score.probability; if (draw < cumulative) return score; }
  return distribution.scores[distribution.scores.length - 1];
}
