import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StandingsTable } from './StandingsTable'
import { mockDashboardData } from '../test/fixtures/dashboard'

describe('StandingsTable', () => {
  it('renderiza os 20 times com posição, pontos e saldo com sinal', () => {
    render(<StandingsTable rows={mockDashboardData.standings} />)

    // O líder é o Flamengo
    expect(screen.getByText('Flamengo')).toBeInTheDocument()
    expect(screen.getByText('60')).toBeInTheDocument() // pontos do líder
    expect(screen.getByText('+30')).toBeInTheDocument() // saldo com +

    // Último time
    expect(screen.getByText('Atlético-GO')).toBeInTheDocument()
    expect(screen.getByText('-25')).toBeInTheDocument() // saldo com -
  })
})
