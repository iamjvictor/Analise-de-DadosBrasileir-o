export type Team = {
  id: string
  name: string
  shortName: string
  crestUrl: string | null
}

export type MatchStatus =
  | 'FINISHED'
  | 'SCHEDULED'
  | 'TIMED'
  | 'POSTPONED'
  | 'IN_PLAY'
  | 'SUSPENDED'
  | 'CANCELLED'

export type Match = {
  id: string
  season: number
  utcDate: string | null
  status: MatchStatus
  matchday: number | null
  homeTeamId: string
  awayTeamId: string
  homeGoals: number | null
  awayGoals: number | null
}

export type StandingRow = {
  team: Team
  position: number
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}
