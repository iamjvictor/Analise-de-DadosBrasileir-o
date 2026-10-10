import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { projectRoot } from '../../paths.js';

const rawDirectory = join(projectRoot, 'data', 'raw');
const apiRoot = 'https://api.football-data.org/v4';
const requestIntervalMs = 6_000;

export type RawMatch = Record<string, unknown> & {
  id: number;
  status: string;
  season: { startDate: string; currentMatchday?: number | null };
  utcDate: string;
  matchday: number | null;
  homeTeam: { id: number; name: string; shortName: string; crest?: string | null };
  awayTeam: { id: number; name: string; shortName: string; crest?: string | null };
  score: { fullTime: { home: number | null; away: number | null } };
};

export type RawMatchesResponse = {
  resultSet: { count: number; [key: string]: unknown };
  matches: RawMatch[];
  [key: string]: unknown;
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface FetchMissingSeasonsOptions {
  seasons: number[];
  existingSeasons?: number[];
  token: string;
  competitionCode?: string;
  fetcher?: FetchLike;
  save?: (season: number, payload: RawMatchesResponse) => Promise<void>;
  throttleMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  continueOnForbidden?: boolean;
  onForbidden?: (season: number) => void;
}

export interface RefreshSeasonOptions {
  season: number;
  token?: string;
  competitionCode?: string;
  fetcher?: FetchLike;
  save?: (season: number, payload: RawMatchesResponse) => Promise<void>;
}

export interface HistoryCollectionResult {
  downloadedSeasons: number[];
  inaccessibleSeasons: number[];
  missingSeasons: number[];
}

function parseJson<T>(text: string, source: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON in ${source}`);
  }
}

export async function listAvailableSeasons(): Promise<number[]> {
  const catalogPath = join(rawDirectory, 'competition.json');
  const catalog = parseJson<{ seasons?: Array<{ startDate?: string }> }>(
    await readFile(catalogPath, 'utf8'),
    'data/raw/competition.json',
  );
  return [...new Set((catalog.seasons ?? [])
    .map(season => Number(season.startDate?.slice(0, 4)))
    .filter(year => Number.isInteger(year) && year >= 1900))].sort((a, b) => a - b);
}

export async function listStoredMatchSeasons(): Promise<number[]> {
  let names: string[];
  try {
    names = await readdir(rawDirectory);
  } catch {
    return [];
  }
  return names.flatMap(name => {
    const match = /^matches-(\d{4})\.json$/.exec(name);
    return match ? [Number(match[1])] : [];
  }).sort((a, b) => a - b);
}

export async function readMatchArchive(season: number): Promise<RawMatchesResponse> {
  const path = join(rawDirectory, `matches-${season}.json`);
  const payload = parseJson<RawMatchesResponse>(await readFile(path, 'utf8'), `data/raw/matches-${season}.json`);
  validateMatchesResponse(payload, season);
  return payload;
}

export async function saveRawMatches(season: number, payload: RawMatchesResponse): Promise<void> {
  validateMatchesResponse(payload, season);
  await mkdir(rawDirectory, { recursive: true });
  const destination = join(rawDirectory, `matches-${season}.json`);
  const temporary = join(dirname(destination), `.matches-${season}.${process.pid}.tmp`);
  await writeFile(temporary, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await rename(temporary, destination);
  const previousManifest = await readOptionalJson<Record<string, unknown>>(join(rawDirectory, `manifest-${season}.json`));
  const previousCounts = previousManifest?.counts && typeof previousManifest.counts === 'object'
    ? previousManifest.counts as Record<string, unknown> : {};
  const statusCounts: Record<string, number> = {};
  const teamIds = new Set<number>();
  for (const match of payload.matches) {
    statusCounts[match.status] = (statusCounts[match.status] ?? 0) + 1;
    teamIds.add(match.homeTeam.id);
    teamIds.add(match.awayTeam.id);
  }
  const competition = payload.competition as { id?: number; code?: string } | undefined;
  const manifest = {
    ...previousManifest,
    provider: 'football-data.org',
    competitionCode: competition?.code ?? previousManifest?.competitionCode ?? 'BSA',
    ...(competition?.id === undefined ? {} : { competitionId: competition.id }),
    season,
    retrievedAt: new Date().toISOString(),
    note: 'Raw API snapshot; all match statuses are preserved and must be revalidated when modeling.',
    files: [...new Set([...(Array.isArray(previousManifest?.files) ? previousManifest.files.filter((file): file is string => typeof file === 'string') : []), `matches-${season}.json`])],
    counts: { ...previousCounts, matches: payload.matches.length, teams: teamIds.size, matchStatuses: statusCounts },
  };
  const manifestPath = join(rawDirectory, `manifest-${season}.json`);
  const manifestTemp = `${manifestPath}.${process.pid}.tmp`;
  await writeFile(manifestTemp, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await rename(manifestTemp, manifestPath);
}

async function readOptionalJson<T>(path: string): Promise<T | undefined> {
  try { return JSON.parse(await readFile(path, 'utf8')) as T; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw new Error(`Invalid manifest JSON at ${path}`);
  }
}

function validateMatchesResponse(payload: RawMatchesResponse, season: number): void {
  if (!payload || !Array.isArray(payload.matches) || !payload.resultSet || !Number.isInteger(payload.resultSet.count)) {
    throw new Error(`Invalid football-data matches response for season ${season}: expected resultSet.count and matches`);
  }
  if (payload.resultSet.count !== payload.matches.length) {
    throw new Error(`Incomplete football-data matches response for season ${season}: expected ${payload.resultSet.count} matches, received ${payload.matches.length}`);
  }
  const ids = new Set<number>();
  const allowedStatuses = new Set(['FINISHED', 'SCHEDULED', 'TIMED', 'POSTPONED', 'IN_PLAY', 'SUSPENDED', 'CANCELLED']);
  for (const match of payload.matches) {
    if (!Number.isInteger(match.id) || ids.has(match.id)) {
      throw new Error(`Invalid football-data matches response for season ${season}: match IDs must be unique integers`);
    }
    ids.add(match.id);
    if (Number(match.season?.startDate?.slice(0, 4)) !== season) {
      throw new Error(`Invalid football-data matches response for season ${season}: match ${match.id} belongs to another season`);
    }
    if (!allowedStatuses.has(match.status)) {
      throw new Error(`Invalid football-data matches response for season ${season}: unsupported status on match ${match.id}`);
    }
    if (!Number.isInteger(match.homeTeam?.id) || !Number.isInteger(match.awayTeam?.id) || match.homeTeam.id === match.awayTeam.id) {
      throw new Error(`Invalid football-data matches response for season ${season}: invalid teams on match ${match.id}`);
    }
    if (match.status === 'FINISHED' && (!Number.isInteger(match.score?.fullTime?.home) || !Number.isInteger(match.score?.fullTime?.away))) {
      throw new Error(`Invalid football-data matches response for season ${season}: finished match ${match.id} has no complete full-time score`);
    }
  }
}

export async function readFootballDataToken(): Promise<string> {
  const token = await readEnvValue('FOOTBALL_DATA_TOKEN');
  if (!token) throw new Error('FOOTBALL_DATA_TOKEN is missing from the project root .env file');
  return token;
}

export async function refreshSeason(options: RefreshSeasonOptions): Promise<void> {
  const token = options.token ?? await readFootballDataToken();
  const competitionCode = options.competitionCode ?? await readEnvValue('FOOTBALL_DATA_COMPETITION') ?? 'BSA';
  const fetcher = options.fetcher ?? fetch;
  const save = options.save ?? saveRawMatches;
  const response = await fetcher(`${apiRoot}/competitions/${encodeURIComponent(competitionCode)}/matches?season=${options.season}`, {
    headers: { 'X-Auth-Token': token },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`football-data request failed with HTTP ${response.status} for season ${options.season}`);
  const payload = parseJson<RawMatchesResponse>(await response.text(), `football-data response for season ${options.season}`);
  validateMatchesResponse(payload, options.season);
  await save(options.season, payload);
}

async function readEnvValue(key: string): Promise<string | undefined> {
  let envText: string;
  try {
    envText = await readFile(join(projectRoot, '.env'), 'utf8');
  } catch {
    return undefined;
  }
  const keyPattern = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const line = envText.split(/\r?\n/).find(value => new RegExp(`^\\s*${keyPattern}\\s*=`).test(value));
  return line?.replace(new RegExp(`^\\s*${keyPattern}\\s*=\\s*`), '').replace(/^(['"])(.*)\1\s*$/, '$2').trim();
}

export async function fetchMissingSeasons(options: FetchMissingSeasonsOptions): Promise<number[]> {
  if (!options.token.trim()) throw new Error('A non-empty football-data token is required');
  const fetcher = options.fetcher ?? fetch;
  const save = options.save ?? saveRawMatches;
  const competitionCode = options.competitionCode?.trim() || 'BSA';
  const throttleMs = options.throttleMs ?? requestIntervalMs;
  const sleep = options.sleep ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
  const existing = new Set(options.existingSeasons ?? await listStoredMatchSeasons());
  // Fetch recent seasons first so an account with limited archive access still gets
  // the newest available history before an older season returns an authorization error.
  const missing = [...new Set(options.seasons)].filter(season => !existing.has(season)).sort((a, b) => b - a);
  const fetched: number[] = [];

  for (let index = 0; index < missing.length; index += 1) {
    if (index > 0 && throttleMs > 0) await sleep(throttleMs);
    const season = missing[index];
    const response = await fetcher(`${apiRoot}/competitions/${encodeURIComponent(competitionCode)}/matches?season=${season}`, {
      headers: { 'X-Auth-Token': options.token },
    });
    if (!response.ok) {
      if (response.status === 403 && options.continueOnForbidden) {
        options.onForbidden?.(season);
        continue;
      }
      throw new Error(`football-data request failed with HTTP ${response.status} for season ${season}`);
    }
    const payload = parseJson<RawMatchesResponse>(await response.text(), `football-data response for season ${season}`);
    validateMatchesResponse(payload, season);
    await save(season, payload);
    fetched.push(season);
  }
  return fetched;
}

export async function collectHistory(): Promise<HistoryCollectionResult> {
  const seasons = await listAvailableSeasons();
  const token = await readFootballDataToken();
  const competitionCode = await readEnvValue('FOOTBALL_DATA_COMPETITION') || 'BSA';
  const inaccessibleSeasons: number[] = [];
  const downloadedSeasons = await fetchMissingSeasons({
    seasons,
    token,
    competitionCode,
    continueOnForbidden: true,
    onForbidden: season => inaccessibleSeasons.push(season),
  });
  const stored = new Set(await listStoredMatchSeasons());
  return {
    downloadedSeasons,
    inaccessibleSeasons,
    missingSeasons: seasons.filter(season => !stored.has(season)),
  };
}
