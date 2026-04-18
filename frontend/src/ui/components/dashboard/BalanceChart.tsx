import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { type ChartTypeBalance, formatCurrency } from '../../types/dashboard'

interface Props {
  chartType: ChartTypeBalance
  onChartTypeChange: (type: ChartTypeBalance) => void
  data: Array<{ date: string; delta: number; acumulado: number }>
}

export function BalanceChart({ chartType, onChartTypeChange, data }: Props) {
  return (
    <div className='card chart-wrap'>
      <div className='card-title'>
        <strong>📈 Saldo Acumulado</strong>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={chartType}
            onChange={(e) => onChartTypeChange(e.target.value as ChartTypeBalance)}
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <option value='line'>Linhas</option>
            <option value='area'>Área</option>
            <option value='bar'>Barras</option>
          </select>
          <div className='muted' style={{ fontSize: '0.85rem' }}>Delta diário</div>
        </div>
      </div>
      {data.length > 0 ? (
        <>
          {chartType === 'line' && (
            <ResponsiveContainer width='100%' height={280}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                <XAxis dataKey='date' />
                <YAxis />
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v))}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Legend />
                <Line
                  type='monotone'
                  dataKey='delta'
                  stroke='#4f46e5'
                  strokeWidth={2}
                  name='Delta Diário'
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type='monotone'
                  dataKey='acumulado'
                  stroke='#10b981'
                  strokeWidth={3}
                  name='Saldo Acumulado'
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          {chartType === 'area' && (
            <ResponsiveContainer width='100%' height={280}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                <XAxis dataKey='date' />
                <YAxis />
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v))}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Legend />
                <Area type='monotone' dataKey='delta' fill='#4f46e5' stroke='#4f46e5' name='Delta Diário' isAnimationActive={false} />
                <Area type='monotone' dataKey='acumulado' fill='#10b981' stroke='#10b981' name='Saldo Acumulado' isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {chartType === 'bar' && (
            <ResponsiveContainer width='100%' height={280}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                <XAxis dataKey='date' />
                <YAxis />
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v))}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Legend />
                <Bar dataKey='delta' fill='#4f46e5' name='Delta Diário' radius={[4, 4, 0, 0]} />
                <Bar dataKey='acumulado' fill='#10b981' name='Saldo Acumulado' radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Sem transações neste período</div>
      )}
    </div>
  )
}
