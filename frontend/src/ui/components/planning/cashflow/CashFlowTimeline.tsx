import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  formatCurrency,
  formatDateBR,
  type PlanningEvent,
  type PlanningOutput,
} from '../../../types/planning'

interface Props {
  data: PlanningOutput
}

interface ChartPoint {
  date: string
  cash: number
  inflow: number
  outflow: number
}

function aggregateByDate(events: PlanningEvent[]) {
  const map = new Map<string, { in: number; out: number }>()
  for (const ev of events) {
    const cur = map.get(ev.date) ?? { in: 0, out: 0 }
    cur.in += ev.in
    cur.out += ev.out
    map.set(ev.date, cur)
  }
  return map
}

export function CashFlowTimeline({ data }: Props) {
  const chartData = useMemo<ChartPoint[]>(() => {
    const flows = aggregateByDate(data.events)
    return data.series.map((p) => {
      const f = flows.get(p.date) ?? { in: 0, out: 0 }
      return {
        date: p.date,
        cash: p.cash,
        inflow: f.in,
        outflow: -f.out,
      }
    })
  }, [data.series, data.events])

  const minPoint = useMemo(
    () => chartData.find((p) => p.date === data.minDateISO),
    [chartData, data.minDateISO],
  )

  return (
    <div className='card chart-wrap'>
      <div className='card-title'>
        <strong>📉 Projeção de saldo</strong>
        <span className='muted' style={{ fontSize: '0.85rem' }}>
          Linha = saldo diário · Áreas = entradas/saídas no dia
        </span>
      </div>
      {chartData.length > 0 ? (
        <ResponsiveContainer width='100%' height={320}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
            <XAxis dataKey='date' tickFormatter={formatDateBR} minTickGap={32} />
            <YAxis tickFormatter={(v) => formatCurrency(Number(v))} width={90} />
            <Tooltip
              formatter={(v: number, name: string) => {
                const label =
                  name === 'cash'
                    ? 'Saldo'
                    : name === 'inflow'
                      ? 'Entradas'
                      : 'Saídas'
                return [formatCurrency(Math.abs(v)), label]
              }}
              labelFormatter={(label) => formatDateBR(String(label))}
            />
            <Legend
              formatter={(value) =>
                value === 'cash' ? 'Saldo projetado' : value === 'inflow' ? 'Entradas' : 'Saídas'
              }
            />
            <Area
              type='monotone'
              dataKey='inflow'
              stroke='#10b981'
              fill='rgba(16,185,129,0.18)'
              name='inflow'
              isAnimationActive={false}
            />
            <Area
              type='monotone'
              dataKey='outflow'
              stroke='#ef4444'
              fill='rgba(239,68,68,0.18)'
              name='outflow'
              isAnimationActive={false}
            />
            <Line
              type='monotone'
              dataKey='cash'
              stroke='#4f46e5'
              strokeWidth={3}
              dot={false}
              name='cash'
              isAnimationActive={false}
            />
            {minPoint && (
              <ReferenceDot
                x={minPoint.date}
                y={minPoint.cash}
                r={6}
                fill={minPoint.cash < 0 ? '#ef4444' : '#0f766e'}
                stroke='#fff'
                strokeWidth={2}
                ifOverflow='visible'
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className='muted centered' style={{ padding: 40 }}>
          Sem dados para projetar neste período.
        </div>
      )}
    </div>
  )
}
