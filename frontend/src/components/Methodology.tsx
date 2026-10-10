import React from 'react'
import type { DashboardMetadata, Methodology as MethodologyType } from '../contracts/dashboard'
import { formatNumber } from '../lib/format'
import { Info, AlertTriangle, GitFork, Calculator, Target } from 'lucide-react'

interface MethodologyProps {
  metadata: DashboardMetadata
  methodology: MethodologyType
}

export const Methodology: React.FC<MethodologyProps> = ({ metadata, methodology }) => {
  return (
    <footer className="bg-[#14171d] border border-[#222730] rounded-xl p-5 sm:p-6 text-slate-300">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-red-500 flex-shrink-0" />
        <h2 className="text-base font-bold text-slate-100 font-heading">
          Metodologia e Transparência do Modelo
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-[#181c23] p-3.5 rounded-lg border border-[#262c37]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Classificação Elo</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cada clube possui um rating dinâmico ({methodology.rating}) atualizado jogo a jogo, com vantagem de mando de campo (+60 pontos) e ajuste de força relativa.
          </p>
        </div>

        <div className="bg-[#181c23] p-3.5 rounded-lg border border-[#262c37]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
            <Calculator className="w-4 h-4 text-blue-400" />
            <span>Distribuição de Poisson</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Gols esperados ({methodology.goalsModel}) calculados a partir da média da liga, eficiência ofensiva e defensiva das equipes e janela de {methodology.recentMatchesWindow} jogos recentes.
          </p>
        </div>

        <div className="bg-[#181c23] p-3.5 rounded-lg border border-[#262c37]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
            <GitFork className="w-4 h-4 text-purple-400" />
            <span>Simulação Monte Carlo</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {formatNumber(metadata.simulations, 0)} temporadas completas simuladas (Semente: {metadata.seed}) para projetar a pontuação esperada e probabilidade de título de cada clube.
          </p>
        </div>
      </div>

      <div className="bg-[#191d26] p-4 rounded-lg border border-[#272e3a]">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Premissas e Limitações Metodológicas</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 leading-relaxed">
          {methodology.limitations.map((limitation, i) => (
            <li key={`limitation-${i}`}>{limitation}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 pt-4 border-t border-[#1e232b] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          Modelo de estimativa probabilística estatística · Versão {metadata.modelVersion}
        </span>
        <span>
          Dados fornecidos por {metadata.provider} (Campeonato Brasileiro Série A 2026)
        </span>
      </div>
    </footer>
  )
}
