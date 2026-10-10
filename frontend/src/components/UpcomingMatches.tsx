import React from 'react'
import type { FixtureView, TeamView } from '../contracts/dashboard'
import { formatPercent, formatMatchSchedule } from '../lib/format'
import { CalendarDays } from 'lucide-react'

interface UpcomingMatchesProps {
  matches: FixtureView[]
}

const featuredTeams = [
  { id: '1769', name: 'Palmeiras', accent: 'emerald' },
  { id: '1783', name: 'Flamengo', accent: 'red' },
] as const

function teamFromFixture(matches: FixtureView[], teamId: string): TeamView | undefined {
  for (const match of matches) {
    if (match.homeTeam.id === teamId) return match.homeTeam
    if (match.awayTeam.id === teamId) return match.awayTeam
  }
  return undefined
}

export const UpcomingMatches: React.FC<UpcomingMatchesProps> = ({ matches }) => {
  const eligibleMatches = matches.filter(match => match.status === 'scheduled')

  return (
    <section className="rounded-xl border border-[#272d37] bg-[#16191f] p-4 shadow-sm sm:p-5">
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-slate-100">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            Palmeiras × Flamengo
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Próximos jogos e probabilidades, separados por time
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start rounded border border-[#282f3a] bg-[#1e232b] px-2.5 py-1 text-xs text-slate-400 sm:self-auto">
          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
          <span>Até 10 jogos por time</span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {featuredTeams.map(featured => {
          const team = teamFromFixture(eligibleMatches, featured.id)
          const teamMatches = eligibleMatches
            .filter(match => match.homeTeam.id === featured.id || match.awayTeam.id === featured.id)
            .sort((a, b) => {
              if (!a.utcDate) return 1
              if (!b.utcDate) return -1
              return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
            })
            .slice(0, 10)

          return (
            <section
              key={featured.id}
              aria-label={`Jogos restantes do ${featured.name}`}
              className={`min-w-0 overflow-hidden rounded-lg border bg-[#191d25] ${featured.accent === 'emerald' ? 'border-emerald-900/40' : 'border-red-900/40'}`}
            >
              <div className="flex items-center justify-between border-b border-[#282e39] px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {team?.crestUrl ? (
                    <img src={team.crestUrl} alt="" className="h-7 w-7 shrink-0 object-contain" loading="lazy" />
                  ) : (
                    <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${featured.accent === 'emerald' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  )}
                  <h3 className="truncate font-heading text-base font-bold text-slate-100">{featured.name}</h3>
                </div>
                <span className="shrink-0 text-[11px] text-slate-500">{teamMatches.length} jogos</span>
              </div>

              {teamMatches.length === 0 ? (
                <p className="px-3.5 py-8 text-center text-sm text-slate-400">Nenhum jogo restante elegível.</p>
              ) : (
                <ol className="divide-y divide-[#262c36] px-3.5">
                  {teamMatches.map(match => {
                    const isHome = match.homeTeam.id === featured.id
                    const opponent = isHome ? match.awayTeam : match.homeTeam
                    const schedule = formatMatchSchedule(match.utcDate)
                    const teamWin = isHome ? match.homeWin : match.awayWin
                    const opponentWin = isHome ? match.awayWin : match.homeWin

                    return (
                      <li key={match.id} className="py-3">
                        <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-medium text-slate-400">
                            {match.round ? `Rodada ${match.round}` : 'Rodada a definir'}
                          </span>
                          <span className="truncate text-right text-slate-400">
                            {schedule.dateText} · {schedule.timeText}
                          </span>
                        </div>

                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {opponent.crestUrl ? (
                              <img src={opponent.crestUrl} alt="" className="h-5 w-5 shrink-0 object-contain" loading="lazy" />
                            ) : null}
                            <span className="truncate text-sm font-semibold text-slate-100" title={opponent.name}>{opponent.shortName}</span>
                          </div>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${isHome ? 'bg-emerald-950/50 text-emerald-300' : 'bg-[#252b36] text-slate-300'}`}>
                            {isHome ? 'Mandante' : 'Visitante'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
                          <div className="rounded bg-[#14171d] px-1 py-1">
                            <span className="block truncate font-sans text-slate-500">{featured.name}</span>
                            <strong className={`font-semibold ${featured.accent === 'emerald' ? 'text-emerald-300' : 'text-red-400'}`}>{formatPercent(teamWin)}</strong>
                          </div>
                          <div className="rounded bg-[#14171d] px-1 py-1">
                            <span className="block font-sans text-slate-500">Empate</span>
                            <strong className="font-medium text-slate-300">{formatPercent(match.draw)}</strong>
                          </div>
                          <div className="rounded bg-[#14171d] px-1 py-1">
                            <span className="block truncate font-sans text-slate-500">Rival</span>
                            <strong className="font-semibold text-blue-300">{formatPercent(opponentWin)}</strong>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}
