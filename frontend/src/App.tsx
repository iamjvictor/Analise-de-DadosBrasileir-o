import { useState, useEffect, useCallback } from 'react'
import type { DashboardResponse } from './contracts/dashboard'
import { fetchDashboard, SnapshotUnavailableError, DashboardApiError } from './lib/api'
import { Header } from './components/Header'
import { SummaryCards } from './components/SummaryCards'
import { ProbabilityChart } from './components/ProbabilityChart'
import { TitleProbabilityTable } from './components/TitleProbabilityTable'
import { StandingsTable } from './components/StandingsTable'
import { RecentFormTable } from './components/RecentFormTable'
import { UpcomingMatches } from './components/UpcomingMatches'
import { Methodology } from './components/Methodology'
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react'

type AppState =
  | { status: 'loading' }
  | { status: 'ready'; data: DashboardResponse }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string }

export default function App() {
  const [state, setState] = useState<AppState>({ status: 'loading' })
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const data = await fetchDashboard()
      setState({ status: 'ready', data })
    } catch (err) {
      if (err instanceof SnapshotUnavailableError) {
        setState({
          status: 'unavailable',
          message: err.message,
        })
      } else if (err instanceof DashboardApiError) {
        setState({
          status: 'error',
          message: err.message,
        })
      } else {
        setState({
          status: 'error',
          message: 'Ocorreu um erro inesperado ao consultar os dados do dashboard.',
        })
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadData()
  }

  // Estado: Carregando
  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0f1115] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
        </div>
        <h2 className="text-base font-bold font-heading text-slate-200">
          Carregando dados do Brasileirão 2026...
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Consultando serviço local em /api/dashboard
        </p>
      </div>
    )
  }

  // Estado: 503 Snapshot Indisponível
  if (state.status === 'unavailable') {
    return (
      <div className="min-h-screen bg-[#0f1115] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#16191f] border border-[#2a303c] rounded-2xl p-6 shadow-xl text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold font-heading text-slate-100 mb-2">
            Snapshot do Modelo Indisponível
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-5">
            A API está ativa, mas ainda não existe uma fotografia calculada em{' '}
            <code className="bg-[#1e232b] px-1.5 py-0.5 rounded text-slate-300 font-mono text-[11px]">
              data/snapshots/latest.json
            </code>.
          </p>

          <div className="bg-[#121418] rounded-xl p-4 text-left border border-[#232832] mb-5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-red-400" />
              Como gerar o snapshot:
            </div>
            <p className="text-xs text-slate-300 mb-2 font-mono">
              Execute no terminal do backend:
            </p>
            <div className="bg-[#0b0d10] p-2.5 rounded-lg border border-[#1b1f26] font-mono text-xs text-emerald-400">
              npm run model:run
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Verificando...' : 'Tentar novamente'}
          </button>
        </div>
      </div>
    )
  }

  // Estado: Erro de Rede ou Validação
  if (state.status === 'error') {
    return (
      <div className="min-h-screen bg-[#0f1115] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#16191f] border border-red-900/30 rounded-2xl p-6 shadow-xl text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold font-heading text-slate-100 mb-2">
            Não foi possível carregar o dashboard
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            {state.message}
          </p>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Reconectando...' : 'Tentar novamente'}
          </button>
        </div>
      </div>
    )
  }

  const { data } = state

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-100 flex flex-col">
      {/* Header com Metadados */}
      <Header
        metadata={data.metadata}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Indicadores Principais */}
        <SummaryCards
          metadata={data.metadata}
          chances={data.championshipProbabilities}
        />

        {/* Bloco 1: Chances de Título - Gráfico + Tabela Completa */}
        <section aria-label="Chances de Título e Projeções" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <ProbabilityChart chances={data.championshipProbabilities} />
          </div>
          <div className="lg:col-span-7">
            <TitleProbabilityTable chances={data.championshipProbabilities} />
          </div>
        </section>

        {/* Bloco 2: Classificação Atual + Forma Recente (10 jogos) */}
        <section aria-label="Classificação e Forma Recente" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StandingsTable rows={data.standings} />
          <RecentFormTable rows={data.recentForm} />
        </section>

        {/* Bloco 3: Próximas Partidas com Probabilidades 1x2 */}
        <section aria-label="Próximos Confrontos">
          <UpcomingMatches matches={data.upcomingMatches} />
        </section>

        {/* Bloco 4: Metodologia e Limitações */}
        <section aria-label="Metodologia e Transparência">
          <Methodology metadata={data.metadata} methodology={data.methodology} />
        </section>
      </main>
    </div>
  )
}
