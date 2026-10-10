import React from 'react'
import type { DashboardMetadata } from '../contracts/dashboard'
import { formatLocalDateTime, formatNumber } from '../lib/format'
import { Calendar, Database, Cpu, Activity } from 'lucide-react'

interface HeaderProps {
  metadata: DashboardMetadata
  onRefresh?: () => void
  isRefreshing?: boolean
}

export const Header: React.FC<HeaderProps> = ({ metadata, onRefresh, isRefreshing }) => {
  return (
    <header className="border-b border-[#222730] bg-[#14171d]/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Main Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-950/40 text-white font-black text-lg border border-red-500/30">
              BR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wider uppercase text-red-500 bg-red-950/40 border border-red-800/40 px-2 py-0.5 rounded">
                  Série A 2026
                </span>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                  Rodada {metadata.currentMatchday}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight font-heading">
                Brasileirão Predictor
              </h1>
            </div>
          </div>

          {/* Action / Refresh */}
          {onRefresh && (
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#20252e] hover:bg-[#282f3a] text-slate-200 border border-[#2d3542] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Activity className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-red-400' : 'text-slate-400'}`} />
                {isRefreshing ? 'Atualizando...' : 'Recarregar dados'}
              </button>
            </div>
          )}
        </div>

        {/* Metadata sub-row */}
        <div className="mt-3 pt-3 border-t border-[#1e232b] flex flex-wrap items-center justify-between gap-y-2 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="flex items-center gap-1.5" title="Momento da última sincronização com o provedor">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Dados coletados em:{' '}
                <strong className="text-slate-300 font-medium">
                  {formatLocalDateTime(metadata.sourceSyncedAt)}
                </strong>
              </span>
            </span>

            <span className="flex items-center gap-1.5" title="Momento da execução do modelo preditivo">
              <Cpu className="w-3.5 h-3.5 text-red-400" />
              <span>
                Modelo calculado em:{' '}
                <strong className="text-slate-300 font-medium">
                  {formatLocalDateTime(metadata.generatedAt)}
                </strong>
              </span>
            </span>

            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Partidas:{' '}
                <span className="text-emerald-400 font-medium">{metadata.finishedMatches} jogadas</span>
                {' · '}
                <span className="text-amber-400 font-medium">{metadata.pendingMatches} pendentes</span>
                {metadata.postponedMatches > 0 && (
                  <>
                    {' · '}
                    <span className="text-orange-400 font-medium">{metadata.postponedMatches} adiada</span>
                  </>
                )}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="bg-[#1b1f26] border border-[#252a33] px-2 py-0.5 rounded text-slate-400">
              Fonte: {metadata.provider}
            </span>
            <span className="bg-[#1b1f26] border border-[#252a33] px-2 py-0.5 rounded text-slate-400">
              {formatNumber(metadata.simulations, 0)} simulações ({metadata.modelVersion})
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
