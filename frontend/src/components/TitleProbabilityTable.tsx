import React from 'react'
import type { TitleChanceView } from '../contracts/dashboard'
import { formatPercent, formatNumber } from '../lib/format'

interface TitleProbabilityTableProps {
  chances: TitleChanceView[]
}

export const TitleProbabilityTable: React.FC<TitleProbabilityTableProps> = ({ chances }) => {
  return (
    <div className="bg-[#16191f] border border-[#272d37] rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-100 font-heading flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          Projeções e Probabilidades Completas
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Detalhamento probabilístico para todos os 20 participantes da Série A 2026
        </p>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse min-w-[540px]">
          <thead>
            <tr className="border-b border-[#2a303c] text-slate-400 uppercase tracking-wider text-[11px] bg-[#1a1f26]/60">
              <th scope="col" className="py-2.5 px-3 font-semibold w-12 text-center">#</th>
              <th scope="col" className="py-2.5 px-3 font-semibold">Clube</th>
              <th scope="col" className="py-2.5 px-3 font-semibold text-right text-red-400">Título (%)</th>
              <th scope="col" className="py-2.5 px-3 font-semibold text-right text-emerald-400">G4 (%)</th>
              <th scope="col" className="py-2.5 px-3 font-semibold text-right">Pts Proj.</th>
              <th scope="col" className="py-2.5 px-3 font-semibold text-right">Pos. Média</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#20252e]">
            {chances.map((item, index) => {
              const isLeader = index === 0
              const isG4 = index < 4

              return (
                <tr
                  key={item.team.id}
                  className={`hover:bg-[#1c222b] transition-colors ${
                    isLeader ? 'bg-red-950/20' : isG4 ? 'bg-[#181d24]/50' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-medium">
                    {index + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      {item.team.crestUrl ? (
                        <img
                          src={item.team.crestUrl}
                          alt=""
                          className="w-5 h-5 object-contain flex-shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-[#272e3b] flex items-center justify-center text-[10px] font-bold text-slate-300 flex-shrink-0">
                          {item.team.shortName.slice(0, 3).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-slate-200 block text-xs">
                          {item.team.shortName}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          {item.team.name}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                    <span
                      className={
                        item.titleProbability > 0.05
                          ? 'text-red-400'
                          : item.titleProbability > 0
                          ? 'text-orange-400'
                          : 'text-slate-400'
                      }
                    >
                      {formatPercent(item.titleProbability)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">
                    <span
                      className={
                        item.top4Probability > 0.5
                          ? 'text-emerald-400'
                          : item.top4Probability > 0.05
                          ? 'text-emerald-300'
                          : 'text-slate-400'
                      }
                    >
                      {formatPercent(item.top4Probability)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                    {formatNumber(item.expectedPoints, 1)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                    {formatNumber(item.averagePosition, 1)}º
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
