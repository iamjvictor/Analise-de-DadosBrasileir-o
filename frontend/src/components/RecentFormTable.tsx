import React from 'react'
import type { RecentFormView, MatchResultChar } from '../contracts/dashboard'
import { formatNumber } from '../lib/format'

interface RecentFormTableProps {
  rows: RecentFormView[]
}

const ResultBadge: React.FC<{ result: MatchResultChar; isLatest?: boolean }> = ({ result, isLatest }) => {
  let label = 'V'
  let colorClasses = 'bg-emerald-950/60 text-emerald-400 border-emerald-700/50'

  if (result === 'D') {
    label = 'E'
    colorClasses = 'bg-amber-950/40 text-amber-300 border-amber-800/40'
  } else if (result === 'L') {
    label = 'D'
    colorClasses = 'bg-red-950/60 text-red-400 border-red-800/50'
  }

  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${colorClasses} ${
        isLatest ? 'ring-1 ring-slate-300 ring-offset-1 ring-offset-[#16191f]' : ''
      }`}
      title={`${label === 'V' ? 'Vitória' : label === 'E' ? 'Empate' : 'Derrota'}${isLatest ? ' (Mais recente)' : ''}`}
    >
      {label}
    </span>
  )
}

export const RecentFormTable: React.FC<RecentFormTableProps> = ({ rows }) => {
  return (
    <div className="bg-[#16191f] border border-[#272d37] rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 font-heading flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            Forma Recente (Últimos 10 Jogos)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Desempenho no recorte recente usado para alimentar a taxa de Poisson
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 flex items-center justify-center font-bold">V</span> Vitória
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40 flex items-center justify-center font-bold">E</span> Empate
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-red-950/80 text-red-400 border border-red-800/50 flex items-center justify-center font-bold">D</span> Derrota
          </span>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse min-w-[620px]">
          <thead>
            <tr className="border-b border-[#2a303c] text-slate-400 uppercase tracking-wider text-[11px] bg-[#1a1f26]/60">
              <th scope="col" className="py-2.5 px-3 font-semibold w-12 text-center">#</th>
              <th scope="col" className="py-2.5 px-3 font-semibold">Clube</th>
              <th scope="col" className="py-2.5 px-2 font-semibold text-center w-14">Últimos</th>
              <th scope="col" className="py-2.5 px-3 font-semibold text-center">
                Sequência (← mais recente)
              </th>
              <th scope="col" className="py-2.5 px-2 font-semibold text-center w-12">PTS</th>
              <th scope="col" className="py-2.5 px-2 font-semibold text-center w-12">PPJ</th>
              <th scope="col" className="py-2.5 px-2 font-semibold text-center w-12">GP</th>
              <th scope="col" className="py-2.5 px-2 font-semibold text-center w-12">GC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#20252e]">
            {rows.map((row, index) => (
              <tr key={row.team.id} className="hover:bg-[#1c222b] transition-colors">
                <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                  {index + 1}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2.5">
                    {row.team.crestUrl ? (
                      <img
                        src={row.team.crestUrl}
                        alt=""
                        className="w-5 h-5 object-contain flex-shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-[#272e3b] flex items-center justify-center text-[10px] font-bold text-slate-300 flex-shrink-0">
                        {row.team.shortName.slice(0, 3).toUpperCase()}
                      </div>
                    )}
                    <span className="font-semibold text-slate-200">
                      {row.team.shortName}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-center font-mono text-slate-400">
                  {row.matches}J
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center justify-center gap-1">
                    {row.sequence.map((result, i) => (
                      <ResultBadge key={`${row.team.id}-seq-${i}`} result={result} isLatest={i === 0} />
                    ))}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-center font-bold text-slate-100 font-mono bg-[#1c222b]/50">
                  {row.points}
                </td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-mono">
                  {formatNumber(row.pointsPerGame, 2)}
                </td>
                <td className="py-2.5 px-2 text-center text-slate-400 font-mono">{row.goalsFor}</td>
                <td className="py-2.5 px-2 text-center text-slate-400 font-mono">{row.goalsAgainst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
