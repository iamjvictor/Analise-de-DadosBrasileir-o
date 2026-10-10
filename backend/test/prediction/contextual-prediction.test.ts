import { describe, expect, it } from 'vitest';
import type { Match, Team } from '../../src/domain/types.js';
import { isParityFixture, PREDICTION_CONFIG } from '../../src/modules/prediction/config.js';
import { predictFixture } from '../../src/modules/prediction/predict.js';

const teams: Team[] = ['Flamengo', 'Fluminense', 'Santos'].map(id => ({ id, name: id, shortName: id, crestUrl: null }));
const fixture: Match = {
  id: 'fixture', season: 2025, utcDate: '2025-10-01T20:00:00Z', status: 'SCHEDULED', matchday: 28,
  homeTeamId: 'Flamengo', awayTeamId: 'Santos', homeGoals: null, awayGoals: null,
};
const match = (id: number, date: string, home: string, away: string, hg: number, ag: number): Match => ({
  id: String(id), season: 2025, utcDate: date, status: 'FINISHED', matchday: id,
  homeTeamId: home, awayTeamId: away, homeGoals: hg, awayGoals: ag,
});

describe('contextual fixture prediction', () => {
  it('uses the direct history for the fixture venue when it is available', () => {
    const history = Array.from({ length: 5 }, (_, i) => match(i + 1, `202${i}-01-01T12:00:00Z`, 'Flamengo', 'Santos', 3, 0));
    const without = predictFixture(fixture, teams, []);
    const withHistory = predictFixture(fixture, teams, [], new Map(), new Map(), history);
    const withOneMatch = predictFixture(fixture, teams, [], new Map(), new Map(), history.slice(-1));

    expect(withHistory.lambdaHome).toBeGreaterThan(without.lambdaHome);
    expect(withHistory.lambdaAway).toBeLessThan(without.lambdaAway);
    expect(withOneMatch.lambdaHome - without.lambdaHome).toBeLessThan(withHistory.lambdaHome - without.lambdaHome);
    expect(withHistory.lambdaHome / without.lambdaHome).toBeCloseTo((3 / 1.35) ** 0.1, 8);
    expect(withHistory.homeWin + withHistory.draw + withHistory.awayWin).toBeCloseTo(1, 10);
  });

  it('responds to five-match form when season goal totals are unchanged', () => {
    const clubs: Team[] = [...teams, { id: 'x', name: 'x', shortName: 'x', crestUrl: null }, { id: 'y', name: 'y', shortName: 'y', crestUrl: null }];
    const winningAndLosing: Match[] = [
      match(1, '2025-09-01T12:00:00Z', 'Flamengo', 'x', 2, 0),
      match(2, '2025-09-02T12:00:00Z', 'Flamengo', 'y', 0, 2),
    ];
    const twoDraws: Match[] = [
      match(1, '2025-09-01T12:00:00Z', 'Flamengo', 'x', 1, 1),
      match(2, '2025-09-02T12:00:00Z', 'Flamengo', 'y', 1, 1),
    ];

    const higherForm = predictFixture(fixture, clubs, winningAndLosing);
    const lowerForm = predictFixture(fixture, clubs, twoDraws);

    expect(higherForm.lambdaHome).toBeGreaterThan(lowerForm.lambdaHome);
    expect(higherForm.lambdaAway).toBeLessThan(lowerForm.lambdaAway);
  });

  it('recognizes listed rivalry pairs symmetrically', () => {
    expect(isParityFixture('1783', '1765')).toBe(true);
    expect(isParityFixture('1765', '1783')).toBe(true);
    expect(isParityFixture('1783', '6685')).toBe(false);
  });

  it('keeps uncalibrated parity neutral unless a validated weight is passed explicitly', () => {
    const derbyTeams: Team[] = [
      { id: '1783', name: 'Flamengo', shortName: 'FLA', crestUrl: null },
      { id: '1765', name: 'Fluminense', shortName: 'FLU', crestUrl: null },
    ];
    const derbyFixture: Match = { ...fixture, homeTeamId: '1783', awayTeamId: '1765' };
    const implicit = predictFixture(derbyFixture, derbyTeams, []);
    const explicitNeutral = predictFixture(derbyFixture, derbyTeams, [], new Map(), new Map(), [], { weights: { parityWeight: 0 } });
    const explicitlyValidated = predictFixture(derbyFixture, derbyTeams, [], new Map(), new Map(), [], { weights: { parityWeight: 0.1 } });

    expect(implicit.lambdaHome).toBeCloseTo(explicitNeutral.lambdaHome);
    expect(implicit.lambdaAway).toBeCloseTo(explicitNeutral.lambdaAway);
    expect(Math.abs(Math.log(explicitlyValidated.lambdaHome / explicitlyValidated.lambdaAway)))
      .toBeLessThan(Math.abs(Math.log(explicitNeutral.lambdaHome / explicitNeutral.lambdaAway)));
  });

  it('uses a strong enough validated parity adjustment to keep listed derbies closer', () => {
    const derbyTeams: Team[] = [
      { id: '1783', name: 'Flamengo', shortName: 'FLA', crestUrl: null },
      { id: '1765', name: 'Fluminense', shortName: 'FLU', crestUrl: null },
    ];
    const derbyFixture: Match = { ...fixture, homeTeamId: '1783', awayTeamId: '1765' };
    const withoutParity = predictFixture(derbyFixture, derbyTeams, [], new Map(), new Map(), [], { weights: { parityWeight: 0 } });
    const withParity = predictFixture(derbyFixture, derbyTeams, [], new Map(), new Map(), [], { weights: { parityWeight: PREDICTION_CONFIG.parityCandidateWeight } });

    expect(PREDICTION_CONFIG.parityCandidateWeight).toBe(0.4);
    expect(withParity.homeWin).toBeLessThan(withoutParity.homeWin);
    expect(withParity.draw).toBeGreaterThan(withoutParity.draw);
    expect(withParity.awayWin).toBeGreaterThan(withoutParity.awayWin);
  });

  it('does not use completed results after the predicted kickoff', () => {
    const futureResult = match(1, '2025-10-02T12:00:00Z', 'Flamengo', 'Santos', 9, 0);
    const noLeak = predictFixture(fixture, teams, [futureResult]);
    const empty = predictFixture(fixture, teams, []);

    expect(noLeak.lambdaHome).toBeCloseTo(empty.lambdaHome);
    expect(noLeak.lambdaAway).toBeCloseTo(empty.lambdaAway);
  });

  it('keeps history neutral when the fixture has no kickoff timestamp', () => {
    const noDateFixture = { ...fixture, utcDate: null };
    const history = Array.from({ length: 5 }, (_, i) => match(i + 1, `202${i}-01-01T12:00:00Z`, 'Flamengo', 'Santos', 3, 0));
    const noHistory = predictFixture(noDateFixture, teams, []);
    const withUnknownCutoff = predictFixture(noDateFixture, teams, [], new Map(), new Map(), history);

    expect(withUnknownCutoff.lambdaHome).toBeCloseTo(noHistory.lambdaHome);
    expect(withUnknownCutoff.lambdaAway).toBeCloseTo(noHistory.lambdaAway);
  });
});
