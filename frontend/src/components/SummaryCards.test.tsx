import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SummaryCards } from './SummaryCards'
import { mockDashboardData } from '../test/fixtures/dashboard'

describe('SummaryCards component', () => {
  it('renderiza o favorito com suas respectivas chances de título e G4', () => {
    render(<SummaryCards metadata={mockDashboardData.metadata} chances={mockDashboardData.championshipProbabilities} />)

    // O favorito na fixture é o Flamengo com 58,4%
    expect(screen.getByText('Flamengo')).toBeInTheDocument()
    expect(screen.getByText('58,4%')).toBeInTheDocument()

    // O G4 do favorito é 96,2%
    expect(screen.getByText('G4 do Flamengo')).toBeInTheDocument()
    expect(screen.getByText('96,2%')).toBeInTheDocument()

    // 2º concorrente é o Palmeiras com 28,1%
    expect(screen.getByText('Palmeiras')).toBeInTheDocument()
    expect(screen.getByText('28,1%')).toBeInTheDocument()

    // 10.000 simulações
    expect(screen.getByText('10.000')).toBeInTheDocument()
  })

  it('renderiza fallback de sigla se o time não possuir escudo cadastrado', () => {
    const customChances = [
      {
        ...mockDashboardData.championshipProbabilities[0],
        team: { id: '999', name: 'Time Sem Escudo FC', shortName: 'TSE', crestUrl: null },
      },
    ]

    render(<SummaryCards metadata={mockDashboardData.metadata} chances={customChances} />)
    expect(screen.getAllByText('TSE')[0]).toBeInTheDocument()
  })
})
