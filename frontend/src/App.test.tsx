import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { mockDashboardData } from './test/fixtures/dashboard'
import * as api from './lib/api'

describe('App Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('exibe estado de carregamento inicialmente e depois os dados em sucesso', async () => {
    vi.spyOn(api, 'fetchDashboard').mockResolvedValueOnce(mockDashboardData)

    render(<App />)

    // Estado inicial de loading
    expect(screen.getByText(/Carregando dados do Brasileirão 2026/i)).toBeInTheDocument()

    // Aguarda o sucesso
    await waitFor(() => {
      expect(screen.getByText('Brasileirão Predictor')).toBeInTheDocument()
    })

    // Seções presentes
    expect(screen.getByText('Favorito ao Título')).toBeInTheDocument()
    expect(screen.getByText('Probabilidade de Título (%)')).toBeInTheDocument()
    expect(screen.getByText('Tabela de Classificação')).toBeInTheDocument()
    expect(screen.getByText('Forma Recente (Últimos 10 Jogos)')).toBeInTheDocument()
    expect(screen.getByText('Palmeiras × Flamengo')).toBeInTheDocument()
    expect(screen.getByText('Metodologia e Transparência do Modelo')).toBeInTheDocument()
  })

  it('exibe mensagem acionável e botão de retry quando a API retorna 503 snapshot_unavailable', async () => {
    vi.spyOn(api, 'fetchDashboard').mockRejectedValueOnce(new api.SnapshotUnavailableError())

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Snapshot do Modelo Indisponível')).toBeInTheDocument()
    })

    // Mostra o comando a executar
    expect(screen.getByText('npm run model:run')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument()
  })

  it('permite tentar novamente ao clicar em Tentar novamente após erro', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(api, 'fetchDashboard')
      .mockRejectedValueOnce(new api.DashboardApiError('Falha temporária de rede'))
      .mockResolvedValueOnce(mockDashboardData)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/Não foi possível carregar o dashboard/i)).toBeInTheDocument()
    })

    const retryBtn = screen.getByRole('button', { name: /Tentar novamente/i })
    await user.click(retryBtn)

    await waitFor(() => {
      expect(screen.getByText('Brasileirão Predictor')).toBeInTheDocument()
    })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})
