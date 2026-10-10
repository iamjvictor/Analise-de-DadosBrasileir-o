/** Versioned feature weights; calibration evaluates a frozen candidate grid before release. */
export const PREDICTION_CONFIG = Object.freeze({
  version: 'v0.2-contextual',
  smoothingMatches: 3,
  recent10Window: 10,
  recent5Window: 5,
  headToHeadWindow: 5,
  recent10Weight: 0.15,
  recent5FormWeight: 0.15,
  venue5Weight: 0.1,
  headToHeadWeight: 0.1,
  parityWeight: 0,
  parityCandidateWeight: 0.4,
  eloScale: 1600,
  lambdaMin: 0.15,
  lambdaMax: 4,
});

const PARITY_PAIRS = [
  ['1783', '1765'], // Flamengo - Fluminense
  ['1783', '1769'], // Flamengo - Palmeiras
  ['1783', '1780'], // Flamengo - Vasco
  ['1769', '6685'], // Palmeiras - Santos
  ['1776', '1769'], // São Paulo - Palmeiras
  ['1776', '1779'], // São Paulo - Corinthians
  ['1776', '6685'], // São Paulo - Santos
  ['1776', '1783'], // São Paulo - Flamengo
] as const;

const pairKey = (a: string, b: string) => [a, b].sort().join('::');
const parityPairKeys = new Set(PARITY_PAIRS.map(([a, b]) => pairKey(a, b)));

/** Club pairs are canonicalized so parity adjustment never depends on home order. */
export function isParityFixture(homeTeamId: string, awayTeamId: string): boolean {
  return parityPairKeys.has(pairKey(homeTeamId, awayTeamId));
}
