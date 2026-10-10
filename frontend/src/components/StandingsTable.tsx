import React from 'react'
import type { StandingView } from '../contracts/dashboard'

interface StandingsTableProps {
  rows: StandingView[]
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ rows }) => {
  return (
    <div className="bg-[#16191f] border border-[#272d37] rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 font-heading flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            Tabela de Classificação
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Classificação oficial após os jogos finalizados da Série A 2026
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> G4 (Fase de Grupos)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> G6 (Pré-Libertadores)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Sul-Americana
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Z4 (Rebaixamento)
          </span>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse min-w-[620px]">
          <thead>
            <tr className="border-b border-[#2a303c] text-slate-400 uppercase tracking-wider text-[11px] bg-[#1a1f26]/60">
              <th scope="col" className="py-2.5 px-3 font-semibold w-12 text-center">Pos</th>
              <th scope="col" className="py-2.5 px-3 font-semibold">Clube</th>
              <th scope="col" className="py-2.5 px-2 font-semibold text-center w-12">PTS</th>
              <th scope="col" className="py-2.5 px-2 font-semibold text-center w-10">J</th>
              <th scope="col" className="py-2.5 px-2 font-semibold text-center w-10">V</th>
              <th scope="col" className="py-2.5 px-2 font-semibold text-center w-10">E</th>
              <th scope="col" className="py-2.5 px-2 font-semibold text-center w-10">D</th>
              <th scope="col" className="py-2.5 px-2 font-semibold text-center w-10">GP</th>
              <th scope="col" className="py-2.5 px-2 font-semibold text-center w-10">GC</th>
              <th scope="col" className="py-2.5 px-2 font-semibold text-center w-12">SG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#20252e]">
            {rows.map((row) => {
              const pos = row.position
              let borderClass = 'border-l-2 border-transparent'
              let posBadgeColor = 'text-slate-400'

              if (pos === 1) {
                borderClass = 'border-l-2 border-emerald-400 bg-emerald-950/10'
                posBadgeColor = 'text-emerald-400 font-bold'
              } else if (pos <= 4) {
                borderClass = 'border-l-2 border-emerald-500'
                posBadgeColor = 'text-emerald-400 font-semibold'
              } else if (pos <= 6) {
                borderClass = 'border-l-2 border-blue-500'
                posBadgeColor = 'text-blue-400'
              } else if (pos <= 12) {
                borderClass = 'border-l-2 border-amber-500/70'
                posBadgeColor = 'text-amber-400'
              } else if (pos >= 17) {
                borderClass = 'border-l-2 border-red-500'
                posBadgeColor = 'text-red-400'
              }

              return (
                <tr key={row.team.id} className={`hover:bg-[#1c222b] transition-colors ${borderClass}`}>
                  <td className={`py-2.5 px-3 text-center font-mono ${posBadgeColor}`}>
                    {row.position}
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
                  <td className="py-2.5 px-2 text-center font-bold text-slate-100 font-mono bg-[#1c222b]/50">
                    {row.points}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{row.played}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{row.wins}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{row.draws}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{row.losses}</td>
                  <td className="py-2.5 px-2 text-center text-slate-400 font-mono">{row.goalsFor}</td>
                  <td className="py-2.5 px-2 text-center text-slate-400 font-mono">{row.goalsAgainst}</td>
                  <td className="py-2.5 px-2 text-center font-mono font-medium">
                    <span
                      className={
                        row.goalDifference > 0
                          ? 'text-emerald-400'
                          : row.goalDifference < 0
                          ? 'text-red-400'
                          : 'text-slate-400'
                      }
                    >
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </span>
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
