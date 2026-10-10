import React from 'react'
import type { DashboardMetadata, TitleChanceView } from '../contracts/dashboard'
import { formatPercent, formatNumber } from '../lib/format'
import { Trophy, ShieldCheck, Flame, Layers } from 'lucide-react'

interface SummaryCardsProps {
  metadata: DashboardMetadata
  chances: TitleChanceView[]
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ metadata, chances }) => {
  const favorite = chances[0]
  const runnerUp = chances[1]

  if (!favorite) {
    return null
  }

  // O indicador de G4 DEVE usar estritamente a mesma linha do favorito para não misturar clubes
  const favoriteG4Chance = favorite.top4Probability

  return (
    <section aria-label="Indicadores principais" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Favorito ao Título */}
      <div className="bg-gradient-to-b from-[#1c212a] to-[#15181f] border border-[#2c3340] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-red-500/40 transition-colors">
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
          <span className="uppercase tracking-wider">Favorito ao Título</span>
          <Trophy className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-center gap-3 my-1">
          {favorite.team.crestUrl ? (
            <img
              src={favorite.team.crestUrl}
              alt={favorite.team.name}
              className="w-10 h-10 object-contain drop-shadow"
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#272f3d] flex items-center justify-center font-bold text-slate-300 text-sm">
              {favorite.team.shortName.slice(0, 3).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-base font-bold text-slate-100 font-heading leading-tight">
              {favorite.team.shortName}
            </div>
            <div className="text-2xl font-black text-red-500 font-heading tracking-tight">
              {formatPercent(favorite.titleProbability)}
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-2 flex items-center justify-between border-t border-[#232935] pt-2">
          <span>Pontos projetados:</span>
          <strong className="text-slate-200 font-semibold">{formatNumber(favorite.expectedPoints, 1)} pts</strong>
        </div>
      </div>

      {/* Card 2: Chance de G4 do Favorito */}
      <div className="bg-gradient-to-b from-[#1c212a] to-[#15181f] border border-[#2c3340] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
          <span className="uppercase tracking-wider">G4 do {favorite.team.shortName}</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="my-1">
          <div className="text-2xl font-black text-emerald-400 font-heading tracking-tight">
            {formatPercent(favoriteG4Chance)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Probabilidade de vaga direta na Libertadores
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-3 border-t border-[#232935] pt-2 flex items-center justify-between">
          <span>Posição média:</span>
          <strong className="text-slate-200 font-semibold">{formatNumber(favorite.averagePosition, 1)}º lugar</strong>
        </div>
      </div>

      {/* Card 3: Principal Perseguidor */}
      <div className="bg-gradient-to-b from-[#1c212a] to-[#15181f] border border-[#2c3340] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-500/40 transition-colors">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
          <span className="uppercase tracking-wider">2º Concorrente</span>
          <Flame className="w-4 h-4 text-orange-400" />
        </div>
        {runnerUp ? (
          <>
            <div className="flex items-center gap-3 my-1">
              {runnerUp.team.crestUrl ? (
                <img
                  src={runnerUp.team.crestUrl}
                  alt={runnerUp.team.name}
                  className="w-9 h-9 object-contain drop-shadow"
                  loading="lazy"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-[#272f3d] flex items-center justify-center font-bold text-slate-300 text-xs">
                  {runnerUp.team.shortName.slice(0, 3).toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-base font-bold text-slate-100 font-heading leading-tight">
                  {runnerUp.team.shortName}
                </div>
                <div className="text-2xl font-black text-slate-200 font-heading tracking-tight">
                  {formatPercent(runnerUp.titleProbability)}
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-400 mt-2 border-t border-[#232935] pt-2 flex items-center justify-between">
              <span>Projeção:</span>
              <strong className="text-slate-200 font-semibold">{formatNumber(runnerUp.expectedPoints, 1)} pts</strong>
            </div>
          </>
        ) : (
          <div className="text-xs text-slate-500 py-3">Sem segundo concorrente calculado</div>
        )}
      </div>

      {/* Card 4: Base do Modelo */}
      <div className="bg-gradient-to-b from-[#1c212a] to-[#15181f] border border-[#2c3340] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-colors">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
          <span className="uppercase tracking-wider">Simulações</span>
          <Layers className="w-4 h-4 text-blue-400" />
        </div>
        <div className="my-1">
          <div className="text-2xl font-black text-blue-400 font-heading tracking-tight">
            {formatNumber(metadata.simulations, 0)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Cenários de Monte Carlo calculados
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-3 border-t border-[#232935] pt-2 flex items-center justify-between">
          <span>Jogos pendentes:</span>
          <strong className="text-slate-200 font-semibold">{metadata.pendingMatches} partidas</strong>
        </div>
      </div>
    </section>
  )
}
