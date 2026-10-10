import React from 'react'
import type { TitleChanceView } from '../contracts/dashboard'
import { formatPercent } from '../lib/format'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ProbabilityChartProps {
  chances: TitleChanceView[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: TitleChanceView }>
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload
    return (
      <div className="bg-[#181c24] border border-[#2e3745] p-3 rounded-lg shadow-xl text-xs z-50">
        <div className="flex items-center gap-2 mb-1.5 font-bold text-slate-100 font-heading">
          {item.team.crestUrl && (
            <img src={item.team.crestUrl} alt="" className="w-4 h-4 object-contain" />
          )}
          <span>{item.team.name}</span>
        </div>
        <div className="space-y-1 text-slate-300">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Probabilidade de Título:</span>
            <strong className="text-red-400 font-bold">{formatPercent(item.titleProbability)}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Probabilidade de G4:</span>
            <strong className="text-emerald-400 font-medium">{formatPercent(item.top4Probability)}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Pontos Esperados:</span>
            <span className="text-slate-200">{item.expectedPoints.toFixed(1)} pts</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export const ProbabilityChart: React.FC<ProbabilityChartProps> = ({ chances }) => {
  // Filtrar ou ordenar os clubes para o gráfico
  // Mostra todos os 20 clubes com suas chances
  const chartData = chances.map((item) => ({
    name: item.team.shortName,
    fullName: item.team.name,
    probability: item.titleProbability * 100, // para escala em %
    raw: item,
  }))

  return (
    <div className="bg-[#16191f] border border-[#272d37] rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 font-heading flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            Probabilidade de Título (%)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Distribuição percentual baseada em 10.000 simulações Monte Carlo
          </p>
        </div>
        <div className="text-[11px] text-slate-400 bg-[#1e232b] px-2.5 py-1 rounded border border-[#2a313d] self-start sm:self-auto">
          Escala: 0% a 100%
        </div>
      </div>

      <div className="w-full h-[620px]" data-testid="probability-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#272d37' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#94a3b8"
              fontSize={11}
              width={90}
              tickLine={false}
              axisLine={{ stroke: '#272d37' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="probability"
              radius={[0, 4, 4, 0]}
              background={{ fill: '#1a1f26' }}
            >
              {chartData.map((entry, index) => {
                const prob = entry.raw.titleProbability
                // Cor de destaque para os líderes
                let fill = '#334155'
                if (index === 0 && prob > 0.05) fill = '#ef4444' // Líder destaque
                else if (index === 1 && prob > 0.05) fill = '#f87171' // 2º
                else if (prob > 0.01) fill = '#fb923c' // Outros com mais de 1%
                else if (prob > 0.001) fill = '#64748b'

                return <Cell key={`cell-${entry.raw.team.id}`} fill={fill} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 border-t border-[#222730] pt-2.5">
        <span>* Valores inferiores a 0,1% aparecem como 0,0% por arredondamento exibido.</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />
            Favorito
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block" />
            Candidatos (&gt;1%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-600 inline-block" />
            Demais
          </span>
        </div>
      </div>
    </div>
  )
}
