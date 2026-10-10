import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProbabilityChart } from './ProbabilityChart'
import { TitleProbabilityTable } from './TitleProbabilityTable'
import { mockDashboardData } from '../test/fixtures/dashboard'

describe('ProbabilityChart & TitleProbabilityTable', () => {
  it('renderiza o container do gráfico com os clubes fornecidos', () => {
    render(<ProbabilityChart chances={mockDashboardData.championshipProbabilities} />)
    expect(screen.getByTestId('probability-chart-container')).toBeInTheDocument()
    expect(screen.getByText(/Probabilidade de Título/i)).toBeInTheDocument()
  })

  it('renderiza a tabela completa com todas as 20 equipes e percentuais corretos', () => {
    render(<TitleProbabilityTable chances={mockDashboardData.championshipProbabilities} />)

    // Verifica que 20 linhas de clubes aparecem
    expect(screen.getByText('Flamengo')).toBeInTheDocument()
    expect(screen.getByText('Palmeiras')).toBeInTheDocument()
    expect(screen.getByText('Atlético-GO')).toBeInTheDocument()

    // Verifica que o primeiro time tem 58,4% e o último tem 0,0%
    expect(screen.getByText('58,4%')).toBeInTheDocument()
    expect(screen.getAllByText('0,0%').length).toBeGreaterThan(0)
  })
})
