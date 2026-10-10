import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { UpcomingMatches } from './UpcomingMatches'
import { mockDashboardData } from '../test/fixtures/dashboard'
import type { FixtureView, TeamView } from '../contracts/dashboard'

const palmeiras = mockDashboardData.standings.find(row => row.team.id === '1769')!.team
const flamengo = mockDashboardData.standings.find(row => row.team.id === '1783')!.team
const opponent = mockDashboardData.standings.find(row => row.team.id === '1778')!.team

function fixture(id: string, team: TeamView, isHome: boolean, index: number): FixtureView {
  return {
    id,
    utcDate: new Date(Date.UTC(2026, 9, 8 + index, 19, 30)).toISOString(),
    round: 29 + index,
    status: 'scheduled',
    homeTeam: isHome ? team : opponent,
    awayTeam: isHome ? opponent : team,
    homeWin: 0.2,
    draw: 0.3,
    awayWin: 0.5,
  }
}

const remainingFixtures: FixtureView[] = [
  ...Array.from({ length: 12 }, (_, i) => fixture(`palmeiras-${i}`, palmeiras, i % 2 === 1, i)),
  ...Array.from({ length: 12 }, (_, i) => fixture(`flamengo-${i}`, flamengo, i % 2 === 0, i)),
  {
    id: 'postponed-palmeiras', utcDate: null, round: 14, status: 'postponed',
    homeTeam: palmeiras, awayTeam: opponent, homeWin: 0.4, draw: 0.3, awayWin: 0.3,
  },
]

describe('UpcomingMatches', () => {
  it('shows ten remaining fixtures for Palmeiras and Flamengo in separate columns', () => {
    render(<UpcomingMatches matches={remainingFixtures} />)

    expect(screen.getByText('Palmeiras × Flamengo')).toBeInTheDocument()
    const palmeirasColumn = screen.getByRole('region', { name: 'Jogos restantes do Palmeiras' })
    const flamengoColumn = screen.getByRole('region', { name: 'Jogos restantes do Flamengo' })
    expect(within(palmeirasColumn).getAllByRole('listitem')).toHaveLength(10)
    expect(within(flamengoColumn).getAllByRole('listitem')).toHaveLength(10)
    const firstPalmeirasMatch = within(palmeirasColumn).getAllByRole('listitem')[0]
    expect(within(firstPalmeirasMatch).getByText('50,0%')).toBeInTheDocument()
  })

  it('shows each team’s win probability from its own home or away perspective', () => {
    render(<UpcomingMatches matches={[fixture('palmeiras-away', palmeiras, false, 0)]} />)
    const palmeirasColumn = screen.getByRole('region', { name: 'Jogos restantes do Palmeiras' })
    expect(within(palmeirasColumn).getByText('50,0%')).toBeInTheDocument()
    expect(within(palmeirasColumn).getByText('20,0%')).toBeInTheDocument()
    expect(within(palmeirasColumn).getByText('Visitante')).toBeInTheDocument()
  })

  it('does not include postponed fixtures in either team schedule', () => {
    render(<UpcomingMatches matches={remainingFixtures.filter(match => match.status === 'postponed')} />)
    expect(screen.getAllByText(/Nenhum jogo restante/)).toHaveLength(2)
  })
})
