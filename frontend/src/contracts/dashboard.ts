import { z } from 'zod'

export const teamViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  crestUrl: z.string().nullable(),
})

export type TeamView = z.infer<typeof teamViewSchema>

export const standingViewSchema = z.object({
  team: teamViewSchema,
  position: z.number().int().positive(),
  played: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  goalsFor: z.number().int().nonnegative(),
  goalsAgainst: z.number().int().nonnegative(),
  goalDifference: z.number().int(),
  points: z.number().int().nonnegative(),
})

export type StandingView = z.infer<typeof standingViewSchema>

export const matchResultCharSchema = z.enum(['W', 'D', 'L'])
export type MatchResultChar = z.infer<typeof matchResultCharSchema>

export const recentFormViewSchema = z.object({
  team: teamViewSchema,
  matches: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  points: z.number().int().nonnegative(),
  pointsPerGame: z.number(),
  goalsFor: z.number().int().nonnegative(),
  goalsAgainst: z.number().int().nonnegative(),
  sequence: z.array(matchResultCharSchema),
})

export type RecentFormView = z.infer<typeof recentFormViewSchema>

export const titleChanceViewSchema = z.object({
  team: teamViewSchema,
  titleProbability: z.number().min(0).max(1),
  top4Probability: z.number().min(0).max(1),
  expectedPoints: z.number(),
  averagePosition: z.number(),
})

export type TitleChanceView = z.infer<typeof titleChanceViewSchema>

export const fixtureStatusSchema = z.enum(['scheduled', 'postponed'])
export type FixtureStatus = z.infer<typeof fixtureStatusSchema>

export const fixtureViewSchema = z.object({
  id: z.string(),
  utcDate: z.string().nullable(),
  round: z.number().nullable(),
  status: fixtureStatusSchema,
  homeTeam: teamViewSchema,
  awayTeam: teamViewSchema,
  homeWin: z.number().min(0).max(1),
  draw: z.number().min(0).max(1),
  awayWin: z.number().min(0).max(1),
})

export type FixtureView = z.infer<typeof fixtureViewSchema>

export const dashboardMetadataSchema = z.object({
  competition: z.literal('BSA'),
  season: z.number().int(),
  provider: z.literal('football-data.org'),
  sourceSyncedAt: z.string(),
  generatedAt: z.string(),
  currentMatchday: z.number().int(),
  modelVersion: z.string(),
  simulations: z.number().int(),
  seed: z.number().int(),
  finishedMatches: z.number().int(),
  pendingMatches: z.number().int(),
  postponedMatches: z.number().int(),
})

export type DashboardMetadata = z.infer<typeof dashboardMetadataSchema>

export const methodologySchema = z.object({
  recentMatchesWindow: z.number().int(),
  rating: z.string(),
  goalsModel: z.string(),
  simulation: z.string(),
  limitations: z.array(z.string()),
})

export type Methodology = z.infer<typeof methodologySchema>

export const dashboardResponseSchema = z.object({
  metadata: dashboardMetadataSchema,
  championshipProbabilities: z.array(titleChanceViewSchema),
  standings: z.array(standingViewSchema),
  recentForm: z.array(recentFormViewSchema),
  upcomingMatches: z.array(fixtureViewSchema),
  methodology: methodologySchema,
})

export type DashboardResponse = z.infer<typeof dashboardResponseSchema>
