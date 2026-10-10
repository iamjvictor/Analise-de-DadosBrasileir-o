import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecentFormTable } from './RecentFormTable'
import { mockDashboardData } from '../test/fixtures/dashboard'

describe('RecentFormTable', () => {
  it('renderiza os times e seus badges de vitória (V), empate (E) e derrota (D)', () => {
    render(<RecentFormTable rows={mockDashboardData.recentForm} />)

    expect(screen.getByText('Flamengo')).toBeInTheDocument()
    expect(screen.getAllByText('V').length).toBeGreaterThan(0)
    expect(screen.getAllByText('E').length).toBeGreaterThan(0)
    expect(screen.getAllByText('D').length).toBeGreaterThan(0)

    // Flamengo tem 2,30 pontos por jogo
    expect(screen.getByText('2,30')).toBeInTheDocument()
  })
})
